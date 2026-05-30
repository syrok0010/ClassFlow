"use server";

import { revalidatePath } from "next/cache";
import { format, isValid, parseISO, set, startOfDay } from "date-fns";
import { z } from "zod";

import type { GroupType } from "@/generated/prisma/enums";
import { getActionErrorMessage } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/server-action-auth";

import type { RequirementMeta } from "../../_lib/admin-schedule-mapper";
import {
  createAdminScheduleTemplateMutationSchema,
  type AdminScheduleTemplateMutationInput,
} from "../../_lib/schedule-mutations-schema";
import { analyzeScheduleTemplateConflicts } from "../../_lib/schedule-conflicts";
import { buildLessonDurationByGroupSubject } from "../../_lib/schedule-duration-map";
import {
  mapScheduleEntryToConflictProjections,
  scheduleEntryInclude,
  type ScheduleEntryRecord,
} from "../_lib/get-admin-schedule-entries-page-data";

const ADMIN_SCHEDULE_ENTRIES_PATH = "/admin/schedule/entries";

const adminScheduleEntryMutationSchema = z.object({
  entryId: z.string().min(1, "Не передан ID записи"),
  date: z.string().min(1, "Не передана дата записи"),
}).and(createAdminScheduleTemplateMutationSchema());

type AdminScheduleEntryMutationInput = AdminScheduleTemplateMutationInput & {
  entryId: string;
  date: string;
};

type ValidationGroupRecord = {
  id: string;
  type: GroupType;
  subjectId: string | null;
  parentId: string | null;
  grade: number | null;
  _count: { studentGroups: number };
};

function buildValidationGroupsById(groups: ValidationGroupRecord[]) {
  return Object.fromEntries(
    groups.map((group) => [
      group.id,
      {
        type: group.type,
        subjectId: group.subjectId,
        studentCount: group._count.studentGroups,
        parentId: group.parentId ?? null,
        grade: group.grade ?? null,
      },
    ]),
  );
}

function mapTimeToDate(baseDate: Date, minutesFromMidnight: number) {
  return set(baseDate, {
    hours: Math.floor(minutesFromMidnight / 60),
    minutes: minutesFromMidnight % 60,
    seconds: 0,
    milliseconds: 0,
  });
}

function parseEntryDate(value: string) {
  const parsed = startOfDay(parseISO(value));

  if (!isValid(parsed) || format(parsed, "yyyy-MM-dd") !== value) {
    return null;
  }

  return parsed;
}

function buildRequirementMetaByGroupSubject(requirements: Array<{
  groupId: string;
  subjectId: string;
  lessonsPerWeek: number;
  breakDuration: number;
}>): Record<string, RequirementMeta> {
  return Object.fromEntries(
    requirements.map((requirement) => [
      `${requirement.groupId}:${requirement.subjectId}`,
      {
        lessonsPerWeek: requirement.lessonsPerWeek,
        breakDuration: requirement.breakDuration,
      },
    ]),
  );
}

export async function updateAdminScheduleEntryAction(input: AdminScheduleEntryMutationInput) {
  await requireAdminContext();

  try {
    const parsed = adminScheduleEntryMutationSchema.parse(input);
    const entryDate = parseEntryDate(parsed.date);

    if (!entryDate) {
      return { error: "Дата записи передана некорректно" };
    }

    const [
      existingEntry,
      subjects,
      groups,
      rooms,
      teachers,
      requirements,
      templates,
      siblingEntries,
    ] = await Promise.all([
      prisma.scheduleEntry.findUnique({
        where: { id: parsed.entryId },
        select: {
          id: true,
          templateId: true,
          subjectId: true,
          attendanceLoadMode: true,
        },
      }),
      prisma.subject.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          defaultAttendanceLoadMode: true,
        },
      }),
      prisma.group.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          subjectId: true,
          parentId: true,
          grade: true,
          _count: {
            select: {
              studentGroups: true,
            },
          },
          parentGroup: {
            select: {
              id: true,
              name: true,
              grade: true,
              type: true,
              _count: {
                select: {
                  studentGroups: true,
                },
              },
            },
          },
          electiveClassLinks: {
            select: {
              classGroupId: true,
              classGroup: {
                select: {
                  id: true,
                  name: true,
                  grade: true,
                  type: true,
                  _count: {
                    select: {
                      studentGroups: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.room.findMany({
        select: {
          id: true,
          name: true,
          seatsCount: true,
          roomSubjects: {
            select: {
              subjectId: true,
            },
          },
        },
      }),
      prisma.teacher.findMany({
        select: {
          id: true,
          user: {
            select: {
              surname: true,
              name: true,
              patronymicName: true,
            },
          },
          teacherSubjects: {
            select: {
              subjectId: true,
              minGrade: true,
              maxGrade: true,
            },
          },
        },
      }),
      prisma.groupSubjectRequirement.findMany({
        select: {
          groupId: true,
          subjectId: true,
          lessonsPerWeek: true,
          breakDuration: true,
          durationInMinutes: true,
        },
      }),
      prisma.weeklyScheduleTemplate.findMany({
        select: {
          subjectId: true,
          deliveryGroupId: true,
          startTime: true,
          endTime: true,
          deliveryGroup: {
            select: {
              type: true,
              parentId: true,
            },
          },
          coveredClasses: {
            select: {
              classGroupId: true,
            },
          },
        },
      }),
      prisma.scheduleEntry.findMany({
        where: {
          date: entryDate,
          id: {
            not: parsed.entryId,
          },
        },
        include: scheduleEntryInclude,
      }),
    ]);

    if (!existingEntry) {
      return { error: "Запись фактического расписания не найдена" };
    }

    const groupById = new Map(groups.map((group) => [group.id, group]));
    const deliveryGroup = parsed.deliveryGroupId ? groupById.get(parsed.deliveryGroupId) ?? null : null;
    const normalizedPayload: AdminScheduleTemplateMutationInput = {
      templateId: parsed.templateId,
      dayOfWeek: parsed.dayOfWeek,
      startMinutes: parsed.startMinutes,
      endMinutes: parsed.endMinutes,
      deliveryMode: parsed.deliveryMode,
      deliveryGroupId: parsed.deliveryGroupId,
      openClassIds:
        parsed.deliveryMode === "ELECTIVE_GROUP" && deliveryGroup
          ? deliveryGroup.electiveClassLinks.map((item) => item.classGroupId)
          : parsed.openClassIds,
      coveredClassIds: parsed.coveredClassIds,
      subjectId: parsed.subjectId,
      roomId: parsed.roomId,
      teacherId: parsed.teacherId,
    };

    const lessonDurationByGroupSubject = buildLessonDurationByGroupSubject(requirements, templates);
    const contextualValidation = createAdminScheduleTemplateMutationSchema({
      subjectsById: Object.fromEntries(
        subjects.map((subject) => [
          subject.id,
          {
            type: subject.type,
            defaultAttendanceLoadMode: subject.defaultAttendanceLoadMode,
          },
        ]),
      ),
      groupsById: buildValidationGroupsById(groups),
      classIds: groups
        .filter((group) => group.type === "CLASS")
        .map((group) => group.id),
      lessonDurationByGroupSubject,
      roomById: Object.fromEntries(
        rooms.map((room) => [
          room.id,
          {
            seatsCount: room.seatsCount,
            subjectIds: room.roomSubjects.map((item) => item.subjectId),
          },
        ]),
      ),
      teacherById: Object.fromEntries(
        teachers.map((teacher) => [
          teacher.id,
          {
            subjects: teacher.teacherSubjects,
          },
        ]),
      ),
    }).safeParse(normalizedPayload);

    if (!contextualValidation.success) {
      return { error: contextualValidation.error.issues[0]?.message ?? "Некорректные данные" };
    }

    if (
      normalizedPayload.dayOfWeek === null
      || normalizedPayload.startMinutes === null
      || normalizedPayload.endMinutes === null
    ) {
      return { error: "Для фактической записи нужно указать время проведения" };
    }

    const subject = subjects.find((item) => item.id === normalizedPayload.subjectId) ?? null;
    if (!subject) {
      return { error: "Предмет не найден" };
    }

    const room = normalizedPayload.roomId
      ? rooms.find((item) => item.id === normalizedPayload.roomId) ?? null
      : null;
    const teacher = normalizedPayload.teacherId
      ? teachers.find((item) => item.id === normalizedPayload.teacherId) ?? null
      : null;
    const coveredClasses = normalizedPayload.coveredClassIds
      .map((classId) => groupById.get(classId) ?? null)
      .filter((group): group is NonNullable<typeof group> => Boolean(group));
    const attendanceLoadMode =
      existingEntry.subjectId === subject.id
        ? existingEntry.attendanceLoadMode
        : subject.defaultAttendanceLoadMode;
    const candidateRecord = {
      id: existingEntry.id,
      templateId: existingEntry.templateId,
      date: entryDate,
      startTime: mapTimeToDate(entryDate, normalizedPayload.startMinutes),
      endTime: mapTimeToDate(entryDate, normalizedPayload.endMinutes),
      subjectId: subject.id,
      roomId: room?.id ?? null,
      teacherId: teacher?.id ?? null,
      deliveryMode: normalizedPayload.deliveryMode,
      deliveryGroupId: normalizedPayload.deliveryMode === "SHARED_CLASSES" ? null : normalizedPayload.deliveryGroupId,
      attendanceLoadMode,
      subject,
      room,
      teacher: teacher
        ? {
            id: teacher.id,
            user: teacher.user,
          }
        : null,
      deliveryGroup:
        normalizedPayload.deliveryMode === "SHARED_CLASSES"
          ? null
          : deliveryGroup
            ? {
                id: deliveryGroup.id,
                name: deliveryGroup.name,
                type: deliveryGroup.type,
                grade: deliveryGroup.grade,
                subjectId: deliveryGroup.subjectId,
                _count: deliveryGroup._count,
                parentGroup: deliveryGroup.parentGroup,
                electiveClassLinks: deliveryGroup.electiveClassLinks,
              }
            : null,
      coveredClasses: coveredClasses.map((schoolClass) => ({
        classGroupId: schoolClass.id,
        schoolClass,
      })),
    } satisfies ScheduleEntryRecord;

    const requirementMetaByGroupSubject = buildRequirementMetaByGroupSubject(requirements);
    const conflictAnalysis = analyzeScheduleTemplateConflicts([
      ...siblingEntries.flatMap((entry) => mapScheduleEntryToConflictProjections(entry, requirementMetaByGroupSubject)),
      ...mapScheduleEntryToConflictProjections(candidateRecord, requirementMetaByGroupSubject),
    ]);

    if (conflictAnalysis.hasHardConflicts) {
      return {
        error: conflictAnalysis.hardConflicts[0]?.message ?? "Запись конфликтует с фактическим расписанием",
      };
    }

    await prisma.scheduleEntry.update({
      where: {
        id: parsed.entryId,
      },
      data: {
        date: entryDate,
        startTime: candidateRecord.startTime,
        endTime: candidateRecord.endTime,
        subjectId: subject.id,
        roomId: room?.id ?? null,
        teacherId: teacher?.id ?? null,
        deliveryMode: normalizedPayload.deliveryMode,
        deliveryGroupId: normalizedPayload.deliveryMode === "SHARED_CLASSES" ? null : normalizedPayload.deliveryGroupId,
        attendanceLoadMode,
        coveredClasses: {
          deleteMany: {},
          ...(coveredClasses.length > 0
            ? {
                create: coveredClasses.map((schoolClass) => ({
                  classGroupId: schoolClass.id,
                })),
              }
            : {}),
        },
      },
    });

    revalidatePath(ADMIN_SCHEDULE_ENTRIES_PATH);
    return { error: null };
  } catch (error) {
    return { error: getActionErrorMessage(error, "Не удалось обновить запись фактического расписания") };
  }
}

export async function deleteAdminScheduleEntryAction(entryId: string) {
  await requireAdminContext();

  if (!entryId) {
    return { error: "Не передан ID записи" };
  }

  try {
    await prisma.scheduleEntry.delete({
      where: {
        id: entryId,
      },
    });

    revalidatePath(ADMIN_SCHEDULE_ENTRIES_PATH);
    return { error: null };
  } catch (error) {
    return { error: getActionErrorMessage(error, "Не удалось удалить запись фактического расписания") };
  }
}
