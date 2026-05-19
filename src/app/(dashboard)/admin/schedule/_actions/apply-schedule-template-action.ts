"use server";

import {addDays, addMinutes, eachDayOfInterval, format, getISODay, startOfDay} from "date-fns";
import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { getActionErrorMessage } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import { requireAdminContext } from "@/lib/server-action-auth";

import {
  applyWeeklyScheduleTemplateActionSchema,
  type ApplyWeeklyScheduleTemplateInput,
} from "../_lib/apply-schedule-template-schema";

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

type WeeklyScheduleTemplateRow = {
  id: string;
  dayOfWeek: number;
  startTime: number;
  endTime: number;
  groupId: string;
  roomId: string | null;
  teacherId: string | null;
  subjectId: string;
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

export async function applyWeeklyScheduleTemplateAction(
  input: ApplyWeeklyScheduleTemplateInput,
): Promise<Result<ApplyWeeklyScheduleTemplateResult>> {
  await requireAdminContext();

  try {
    const validated = applyWeeklyScheduleTemplateActionSchema.parse(input);
    const startDate = startOfDay(validated.startDate);
    const endDate = startOfDay(validated.endDate);
    const rangeEndExclusive = addDays(endDate, 1);
    const affectedDates = eachDayOfInterval({ start: startDate, end: endDate }).map((date) =>
        format(date, DATE_FORMAT),
    );

    const templates = await prisma.weeklyScheduleTemplate.findMany({
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

    const entriesToCreate = buildScheduleEntriesFromTemplates(templates, startDate, endDate);

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

      const created = await tx.scheduleEntry.createMany({
        data: entriesToCreate,
      });

      return {
        deletedEntriesCount: deleted.count,
        createdEntriesCount: created.count,
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
): Prisma.ScheduleEntryCreateManyInput[] {

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
      groupId: template.groupId,
      roomId: template.roomId,
      teacherId: template.teacherId,
      subjectId: template.subjectId,
    }));
  });
}
