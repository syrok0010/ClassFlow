import { addDays, format, isValid, parse, startOfDay, startOfWeek } from "date-fns";

import type { ScheduleViewMode } from "@/features/schedule";

export const DEFAULT_STUDENT_SCHEDULE_VIEW: ScheduleViewMode = "week";

export function parseStudentScheduleView(value: string | string[] | undefined): ScheduleViewMode {
  return value === "day" ? "day" : DEFAULT_STUDENT_SCHEDULE_VIEW;
}

export function parseStudentScheduleDate(value: string | string[] | undefined): Date {
  if (typeof value !== "string") {
    return startOfDay(new Date());
  }

  const parsedDate = parse(value, "yyyy-MM-dd", new Date());

  if (!isValid(parsedDate) || format(parsedDate, "yyyy-MM-dd") !== value) {
    return startOfDay(new Date());
  }

  return startOfDay(parsedDate);
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
