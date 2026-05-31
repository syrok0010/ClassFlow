"use server";

import {addDays, addMinutes, eachDayOfInterval, format, getISODay, startOfDay} from "date-fns";
import { revalidatePath } from "next/cache";

import type { AttendanceLoadMode, ScheduleDeliveryMode } from "@/generated/prisma/enums";
import { getActionErrorMessage } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import { requireAdminContext } from "@/lib/server-action-auth";

import {
  applyWeeklyScheduleTemplateActionSchema,
  type ApplyWeeklyScheduleTemplateInput,
} from "../_lib/apply-schedule-template-schema";
import {
  applyScheduleTemplateValidationInclude,
  validateApplyScheduleTemplateState,
  type ApplyScheduleTemplateValidationResult,
} from "../_lib/apply-schedule-template-validation";
import { getScheduleBreakValidationEnabled } from "../_lib/schedule-validation-env";

const ADMIN_SCHEDULE_PATH = "/admin/schedule";
const DATE_FORMAT = "yyyy-MM-dd";

export interface ApplyWeeklyScheduleTemplatePreview {
  existingEntriesCount: number;
  startDate: string;
  endDate: string;
}

export interface ApplyWeeklyScheduleTemplateResult {
  status: "applied";
  deletedEntriesCount: number;
  createdEntriesCount: number;
  startDate: string;
  endDate: string;
  affectedDates: string[];
}

export type ApplyWeeklyScheduleTemplateValidationPreview =
  ApplyScheduleTemplateValidationResult;

type WeeklyScheduleTemplateRow = {
  id: string;
  dayOfWeek: number;
  startTime: number;
  endTime: number;
  deliveryMode: ScheduleDeliveryMode;
  deliveryGroupId: string | null;
  attendanceLoadModeOverride: AttendanceLoadMode | null;
  roomId: string | null;
  teacherId: string | null;
  subjectId: string;
  subject: {
    defaultAttendanceLoadMode: AttendanceLoadMode;
  };
  coveredClasses: Array<{
    classGroupId: string;
  }>;
};

type ScheduleEntryDraft = {
  templateId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  deliveryMode: ScheduleDeliveryMode;
  deliveryGroupId: string | null;
  attendanceLoadMode: AttendanceLoadMode;
  roomId: string | null;
  teacherId: string | null;
  subjectId: string;
  coveredClassIds: string[];
};

export async function getWeeklyScheduleTemplateApplyPreviewAction(
  input: ApplyWeeklyScheduleTemplateInput,
): Promise<Result<ApplyWeeklyScheduleTemplatePreview>> {
  await requireAdminContext();

  try {
    const validated = applyWeeklyScheduleTemplateActionSchema.parse(input);
    const startDate = startOfDay(validated.startDate);
    const endDate = startOfDay(validated.endDate);

    const rangeEndExclusive = addDays(endDate, 1);
    const existingEntriesCount = await prisma.scheduleEntry.count({
      where: {
        date: {
          gte: startDate,
          lt: rangeEndExclusive,
        },
      },
    });

    return ok({
      existingEntriesCount,
      startDate: format(startDate, DATE_FORMAT),
      endDate: format(endDate, DATE_FORMAT),
    });
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось проверить период расписания"));
  }
}

export async function getWeeklyScheduleTemplateApplyValidationAction():
Promise<Result<ApplyWeeklyScheduleTemplateValidationPreview>> {
  await requireAdminContext();

  try {
    return ok(await loadApplyScheduleTemplateValidation());
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось проверить недельный шаблон"));
  }
}

export async function applyWeeklyScheduleTemplateAction(
  input: ApplyWeeklyScheduleTemplateInput,
): Promise<Result<ApplyWeeklyScheduleTemplateResult>> {
  await requireAdminContext();

  try {
    const validated = applyWeeklyScheduleTemplateActionSchema.parse(input);
    const validation = await loadApplyScheduleTemplateValidation();

    if (!validation.isValid) {
      return err(
        validation.errorMessages[0]
        ?? "Недельный шаблон содержит ошибки и не может быть применен",
      );
    }

    const startDate = startOfDay(validated.startDate);
    const endDate = startOfDay(validated.endDate);
    const rangeEndExclusive = addDays(endDate, 1);
    const affectedDates = eachDayOfInterval({ start: startDate, end: endDate }).map((date) =>
        format(date, DATE_FORMAT),
    );

    const templates = await prisma.weeklyScheduleTemplate.findMany({
      where: {
        dayOfWeek: { not: null },
        startTime: { not: null },
        endTime: { not: null },
      },
      include: {
        subject: {
          select: {
            defaultAttendanceLoadMode: true,
          },
        },
        coveredClasses: {
          select: {
            classGroupId: true,
          },
        },
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
        { endTime: "asc" },
        { id: "asc" },
      ],
    });

    if (templates.length === 0) {
      return err("Недельный шаблон расписания пуст");
    }

    const scheduledTemplates: WeeklyScheduleTemplateRow[] = templates.flatMap((template) => {
      if (template.dayOfWeek === null || template.startTime === null || template.endTime === null) {
        return [];
      }

      return [{
        ...template,
        dayOfWeek: template.dayOfWeek,
        startTime: template.startTime,
        endTime: template.endTime,
      }];
    });
    const entriesToCreate = buildScheduleEntriesFromTemplates(scheduledTemplates, startDate, endDate);

    const result = await prisma.$transaction(async (tx) => {
      const deleted = await tx.scheduleEntry.deleteMany({
        where: {
          date: {
            gte: startDate,
            lt: rangeEndExclusive,
          },
        },
      });

      if (entriesToCreate.length === 0) {
        return {
          deletedEntriesCount: deleted.count,
          createdEntriesCount: 0,
        };
      }

      for (const entry of entriesToCreate) {
        await tx.scheduleEntry.create({
          data: {
            templateId: entry.templateId,
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            deliveryMode: entry.deliveryMode,
            deliveryGroupId: entry.deliveryGroupId,
            attendanceLoadMode: entry.attendanceLoadMode,
            roomId: entry.roomId,
            teacherId: entry.teacherId,
            subjectId: entry.subjectId,
            coveredClasses:
              entry.coveredClassIds.length > 0
                ? {
                    create: entry.coveredClassIds.map((classGroupId) => ({ classGroupId })),
                  }
                : undefined,
          },
        });
      }

      return {
        deletedEntriesCount: deleted.count,
        createdEntriesCount: entriesToCreate.length,
      };
    });

    revalidatePath(ADMIN_SCHEDULE_PATH);

    return ok({
      status: "applied",
      ...result,
      startDate: format(startDate, DATE_FORMAT),
      endDate: format(endDate, DATE_FORMAT),
      affectedDates,
    });
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось применить недельный шаблон расписания"));
  }
}

function buildScheduleEntriesFromTemplates(
    templates: WeeklyScheduleTemplateRow[],
    startDate: Date,
    endDate: Date,
): ScheduleEntryDraft[] {

  const templatesByDay = templates.reduce(
      (acc, template) => {
        const dayTemplates = acc.get(template.dayOfWeek) ?? [];
        dayTemplates.push(template);
        acc.set(template.dayOfWeek, dayTemplates);
        return acc;
      },
      new Map<number, WeeklyScheduleTemplateRow[]>(),
  );

  return eachDayOfInterval({ start: startDate, end: endDate }).flatMap((date) => {
    const dayStart = startOfDay(date);
    const dayTemplates = templatesByDay.get(getISODay(dayStart)) ?? [];

    return dayTemplates.map((template) => ({
      templateId: template.id,
      date: dayStart,
      startTime: addMinutes(dayStart, template.startTime),
      endTime: addMinutes(dayStart, template.endTime),
      deliveryMode: template.deliveryMode,
      deliveryGroupId: template.deliveryGroupId,
      attendanceLoadMode: template.attendanceLoadModeOverride ?? template.subject.defaultAttendanceLoadMode,
      roomId: template.roomId,
      teacherId: template.teacherId,
      subjectId: template.subjectId,
      coveredClassIds: template.coveredClasses.map((coveredClass) => coveredClass.classGroupId),
    }));
  });
}

async function loadApplyScheduleTemplateValidation() {
  const [templates, subjects, groups, rooms, teachers, requirements] = await Promise.all([
    prisma.weeklyScheduleTemplate.findMany({
      include: applyScheduleTemplateValidationInclude,
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
        { endTime: "asc" },
        { id: "asc" },
      ],
    }),
    prisma.subject.findMany({
      select: { id: true, name: true, type: true, defaultAttendanceLoadMode: true },
    }),
    prisma.group.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        subjectId: true,
        parentId: true,
        grade: true,
        _count: { select: { studentGroups: true } },
      },
    }),
    prisma.room.findMany({
      select: {
        id: true,
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
  ]);

  return validateApplyScheduleTemplateState({
    templates,
    subjects,
    groups,
    rooms,
    teachers,
    requirements,
    scheduleConflictOptions: {
      validateBreakDuration: getScheduleBreakValidationEnabled(),
    },
  });
}
