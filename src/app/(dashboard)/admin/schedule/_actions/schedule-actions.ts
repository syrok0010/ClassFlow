"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import type { GroupType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/server-action-auth";

import {
  adminScheduleTemplateMutationSchema,
  adminScheduleTemplateTimeMoveSchema,
  createAdminScheduleTemplateMutationSchema,
  type AdminScheduleTemplateMutationInput,
  type AdminScheduleTemplateTimeMoveInput,
} from "../_lib/schedule-mutations-schema";
import { buildLessonDurationByGroupSubject } from "../_lib/schedule-duration-map";

const SCHEDULE_PATH = "/admin/schedule";

type ValidationGroupRecord = {
  id: string;
  type: GroupType;
  subjectId: string | null;
  parentId: string | null;
  grade: number | null;
  _count: { studentGroups: number };
};

function getRequirementGroupIds(payload: AdminScheduleTemplateMutationInput) {
  if (payload.deliveryMode === "SHARED_CLASSES") {
    return payload.coveredClassIds;
  }

  return payload.deliveryGroupId ? [payload.deliveryGroupId] : [];
}

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

export async function createOrUpdateAdminScheduleTemplateAction(input: AdminScheduleTemplateMutationInput) {
  await requireAdminContext();
  const parsed = adminScheduleTemplateMutationSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const payload = {
    ...parsed.data,
    openClassIds: Array.from(new Set(parsed.data.openClassIds)),
    coveredClassIds: Array.from(new Set(parsed.data.coveredClassIds)),
  };
  const isDetached =
    payload.dayOfWeek === null
    || payload.startMinutes === null
    || payload.endMinutes === null;

  const subject = await prisma.subject.findUnique({
    where: { id: payload.subjectId },
    select: { id: true, type: true, defaultAttendanceLoadMode: true },
  });

  const deliveryGroup = payload.deliveryGroupId
    ? await prisma.group.findUnique({
        where: { id: payload.deliveryGroupId },
        select: {
          id: true,
          type: true,
          subjectId: true,
          parentId: true,
          grade: true,
          _count: { select: { studentGroups: true } },
        },
      })
    : null;

  const groupLookupIds = Array.from(
    new Set([
      ...payload.openClassIds,
      ...payload.coveredClassIds,
      ...(payload.deliveryGroupId ? [payload.deliveryGroupId] : []),
      ...(deliveryGroup?.parentId ? [deliveryGroup.parentId] : []),
    ]),
  );
  const linkedClasses = groupLookupIds.length > 0
    ? await prisma.group.findMany({
        where: { id: { in: groupLookupIds } },
        select: {
          id: true,
          type: true,
          subjectId: true,
          parentId: true,
          grade: true,
          _count: { select: { studentGroups: true } },
        },
      })
    : [];
  const requirementGroupIds = getRequirementGroupIds(payload);
  const [room, teacher, requirements, existingDurationTemplates] = await Promise.all([
    payload.roomId
      ? prisma.room.findUnique({
          where: { id: payload.roomId },
          select: {
            id: true,
            seatsCount: true,
            roomSubjects: { select: { subjectId: true } },
          },
        })
      : null,
    payload.teacherId
      ? prisma.teacher.findUnique({
          where: { id: payload.teacherId },
          select: {
            id: true,
            teacherSubjects: {
              select: {
                subjectId: true,
                minGrade: true,
                maxGrade: true,
              },
            },
          },
        })
      : null,
    prisma.groupSubjectRequirement.findMany({
      where: {
        groupId: {
          in: requirementGroupIds,
        },
        subjectId: payload.subjectId,
      },
      select: {
        groupId: true,
        subjectId: true,
        durationInMinutes: true,
      },
    }),
    prisma.weeklyScheduleTemplate.findMany({
      where: {
        subjectId: payload.subjectId,
        OR: [
          { deliveryGroupId: { in: requirementGroupIds } },
          { coveredClasses: { some: { classGroupId: { in: requirementGroupIds } } } },
        ],
      },
      select: {
        subjectId: true,
        deliveryGroupId: true,
        startTime: true,
        endTime: true,
        coveredClasses: { select: { classGroupId: true } },
      },
    }),
  ]);
  const groupsForValidation = [
    ...linkedClasses,
    ...(deliveryGroup && !linkedClasses.some((group) => group.id === deliveryGroup.id) ? [deliveryGroup] : []),
  ];

  const contextualValidation = createAdminScheduleTemplateMutationSchema({
    subjectsById: subject
      ? {
          [subject.id]: {
            type: subject.type,
            defaultAttendanceLoadMode: subject.defaultAttendanceLoadMode,
          },
        }
      : {},
    groupsById: buildValidationGroupsById(groupsForValidation),
    classIds: linkedClasses.filter((group) => group.type === "CLASS").map((group) => group.id),
    lessonDurationByGroupSubject: buildLessonDurationByGroupSubject(requirements, existingDurationTemplates),
    roomById: room
      ? {
          [room.id]: {
            seatsCount: room.seatsCount,
            subjectIds: room.roomSubjects.map((item) => item.subjectId),
          },
        }
      : {},
    teacherById: teacher
      ? {
          [teacher.id]: {
            subjects: teacher.teacherSubjects,
          },
        }
      : {},
  }).safeParse(payload);

  if (!contextualValidation.success) {
    return { error: contextualValidation.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const openClassesCreate = payload.openClassIds.map((classGroupId) => ({ classGroupId }));
  const coveredClassesCreate = payload.coveredClassIds.map((classGroupId) => ({ classGroupId }));

  const sharedData = {
    dayOfWeek: isDetached ? null : payload.dayOfWeek,
    startTime: isDetached ? null : payload.startMinutes,
    endTime: isDetached ? null : payload.endMinutes,
    subjectId: payload.subjectId,
    roomId: payload.roomId,
    teacherId: payload.teacherId,
    deliveryMode: payload.deliveryMode,
    deliveryGroupId: payload.deliveryMode === "SHARED_CLASSES" ? null : payload.deliveryGroupId,
  };

  if (payload.templateId) {
    const updateData = {
      ...sharedData,
      openClasses: {
        deleteMany: {},
        ...(openClassesCreate.length > 0 ? { create: openClassesCreate } : {}),
      },
      coveredClasses: {
        deleteMany: {},
        ...(coveredClassesCreate.length > 0 ? { create: coveredClassesCreate } : {}),
      },
    } satisfies Prisma.WeeklyScheduleTemplateUncheckedUpdateInput;

    await prisma.weeklyScheduleTemplate.update({
      where: { id: payload.templateId },
      data: updateData,
    });
  } else {
    const createData = {
      ...sharedData,
      ...(openClassesCreate.length > 0 ? { openClasses: { create: openClassesCreate } } : {}),
      ...(coveredClassesCreate.length > 0 ? { coveredClasses: { create: coveredClassesCreate } } : {}),
    } satisfies Prisma.WeeklyScheduleTemplateUncheckedCreateInput;

    await prisma.weeklyScheduleTemplate.create({ data: createData });
  }

  revalidatePath(SCHEDULE_PATH);
  return { error: null };
}

export async function moveAdminScheduleTemplateAction(input: AdminScheduleTemplateTimeMoveInput) {
  await requireAdminContext();
  const parsed = adminScheduleTemplateTimeMoveSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const isDetached =
    parsed.data.dayOfWeek === null
    || parsed.data.startMinutes === null
    || parsed.data.endMinutes === null;

  await prisma.weeklyScheduleTemplate.update({
    where: { id: parsed.data.templateId },
    data: {
      dayOfWeek: isDetached ? null : parsed.data.dayOfWeek,
      startTime: isDetached ? null : parsed.data.startMinutes,
      endTime: isDetached ? null : parsed.data.endMinutes,
    },
  });

  revalidatePath(SCHEDULE_PATH);
  return { error: null };
}

export async function deleteAdminScheduleTemplateAction(templateId: string) {
  await requireAdminContext();

  if (!templateId) {
    return { error: "Не передан ID шаблона" };
  }

  await prisma.weeklyScheduleTemplate.delete({
    where: { id: templateId },
  });

  revalidatePath(SCHEDULE_PATH);
  return { error: null };
}
