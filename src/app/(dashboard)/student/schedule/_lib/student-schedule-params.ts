import { addDays, format, startOfDay, startOfWeek } from "date-fns";

import type { ScheduleViewMode } from "@/features/schedule";

export const DEFAULT_STUDENT_SCHEDULE_VIEW: ScheduleViewMode = "week";

export function parseStudentScheduleView(value: string | string[] | undefined): ScheduleViewMode {
  return value === "day" ? "day" : DEFAULT_STUDENT_SCHEDULE_VIEW;
}

export function parseStudentScheduleDate(value: string | string[] | undefined): Date {
  if (typeof value !== "string") {
    return startOfDay(new Date());
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return startOfDay(new Date());
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return startOfDay(new Date());
  }

  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return startOfDay(new Date());
  }

  return startOfDay(parsedDate);
}

export function formatStudentScheduleDateParam(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getStudentScheduleRange(anchorDate: Date, viewMode: ScheduleViewMode): {
  rangeStart: Date;
  rangeEnd: Date;
} {
  const safeAnchorDate = startOfDay(anchorDate);

  if (viewMode === "day") {
    return {
      rangeStart: safeAnchorDate,
      rangeEnd: addDays(safeAnchorDate, 1),
    };
  }

  const rangeStart = startOfWeek(safeAnchorDate, { weekStartsOn: 1 });

  return {
    rangeStart,
    rangeEnd: addDays(rangeStart, 7),
  };
}
