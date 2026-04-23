import {
  addDays,
  differenceInMinutes,
  format,
  isSameMonth,
  startOfDay,
} from "date-fns";
import { ru } from "date-fns/locale";
import type { AvailabilityType } from "@/generated/prisma/enums";
import type {
  AvailabilityOverrideEntry,
  AvailabilityTeacher,
  AvailabilityTemplateEntry,
  DayConfig,
  SlotBreakdown,
  SlotTeacherState,
} from "./types";

export const DAY_START_MINUTES = 8 * 60;
export const DAY_END_MINUTES = 18 * 60;
export const SLOT_MINUTES = 60;
export const SLOT_COUNT = (DAY_END_MINUTES - DAY_START_MINUTES) / SLOT_MINUTES;

export const DAY_CONFIG: DayConfig[] = [
  { dayOfWeek: 1, shortLabel: "Пн", label: "Понедельник" },
  { dayOfWeek: 2, shortLabel: "Вт", label: "Вторник" },
  { dayOfWeek: 3, shortLabel: "Ср", label: "Среда" },
  { dayOfWeek: 4, shortLabel: "Чт", label: "Четверг" },
  { dayOfWeek: 5, shortLabel: "Пт", label: "Пятница" },
];

export const AVAILABILITY_TYPE_LABELS: Record<AvailabilityType, string> = {
  PREFERRED: "Предпочтительно",
  AVAILABLE: "Доступно",
  UNAVAILABLE: "Недоступно",
};

export const AVAILABILITY_TYPE_BADGE_VARIANTS: Record<
  AvailabilityType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PREFERRED: "default",
  AVAILABLE: "secondary",
  UNAVAILABLE: "destructive",
};

export function getWeekRangeLabel(weekStart: Date): string {
  const start = weekStart;
  const end = addDays(start, 6);
  const endLabel = format(end, "d MMMM", { locale: ru });
  const startLabel = format(
    start,
    isSameMonth(start, end)
      ? "d"
      : "d MMMM",
    { locale: ru }
  );

  return `${startLabel} - ${endLabel}`;
}

export function getDayDateLabel(weekStart: Date, dayOfWeek: number): string {
  const date = addDays(weekStart, dayOfWeek - 1);
  return format(date, "d MMM", { locale: ru });
}

export function formatTimeRange(startTimeMinutes: number, endTimeMinutes: number): string {
  return `${minutesToTime(startTimeMinutes)} - ${minutesToTime(endTimeMinutes)}`;
}

export function formatDateRange(start: Date, end: Date): string {
  const startLabel = format(start, "d MMM", { locale: ru });
  const endLabel = format(end, "d MMM", { locale: ru });

  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

export function minutesToTime(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function buildSlotLabels(): string[] {
  const labels: string[] = [];

  for (let minutes = DAY_START_MINUTES; minutes < DAY_END_MINUTES; minutes += SLOT_MINUTES) {
    labels.push(minutesToTime(minutes));
  }

  return labels;
}

export function getTeacherDayEntries(
  teacher: AvailabilityTeacher,
  dayOfWeek: number,
): AvailabilityTemplateEntry[] {
  return teacher.templateEntries
    .filter((entry) => entry.dayOfWeek === dayOfWeek)
    .sort((left, right) => left.startTime - right.startTime);
}

export function getTeacherOverrideEntriesForWeek(
  teacher: AvailabilityTeacher,
  weekStart: Date,
): AvailabilityOverrideEntry[] {
  const weekEnd = addDays(weekStart, 7);

  return teacher.overrides
    .filter((entry) => {
      const start = entry.startTime;
      const end = entry.endTime;
      return start < weekEnd && end > weekStart;
    })
    .sort((left, right) => left.startTime.getTime() - right.startTime.getTime());
}

export function hasWeekOverride(teacher: AvailabilityTeacher, weekStart: Date): boolean {
  return getTeacherOverrideEntriesForWeek(teacher, weekStart).length > 0;
}

export function getTemplateCoverageCount(teacher: AvailabilityTeacher): number {
  return teacher.templateEntries.length;
}

export function normalizeTemplateEntries(
  entries: Array<Pick<AvailabilityTemplateEntry, "dayOfWeek" | "startTime" | "endTime" | "type">>,
): Array<Pick<AvailabilityTemplateEntry, "dayOfWeek" | "startTime" | "endTime" | "type">> {
  const normalized: Array<Pick<
    AvailabilityTemplateEntry,
    "dayOfWeek" | "startTime" | "endTime" | "type"
  >> = [];

  for (const day of DAY_CONFIG) {
    const dayEntries = entries
      .filter((entry) => entry.dayOfWeek === day.dayOfWeek)
      .filter((entry) => entry.startTime < entry.endTime);

    if (dayEntries.length === 0) {
      continue;
    }

    const points = Array.from(
      new Set(dayEntries.flatMap((entry) => [entry.startTime, entry.endTime])),
    ).sort((left, right) => left - right);

    for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
      const segmentStart = points[pointIndex];
      const segmentEnd = points[pointIndex + 1];
      const overlapping = dayEntries.filter(
        (entry) => entry.startTime < segmentEnd && entry.endTime > segmentStart,
      );

      if (overlapping.length === 0) {
        continue;
      }

      const active = overlapping.at(-1);
      if (!active) {
        continue;
      }

      const previous = normalized.at(-1);
      if (
        previous
        && previous.dayOfWeek === day.dayOfWeek
        && previous.type === active.type
        && previous.endTime === segmentStart
      ) {
        previous.endTime = segmentEnd;
        continue;
      }

      normalized.push({
        dayOfWeek: day.dayOfWeek,
        startTime: segmentStart,
        endTime: segmentEnd,
        type: active.type,
      });
    }
  }

  return normalized;
}

type MinuteRange = {
  startMinute: number;
  endMinute: number;
};

type OverrideMinuteRange = AvailabilityOverrideEntry & MinuteRange;

export type AvailabilityTimelineSegment = MinuteRange & {
  type: AvailabilityType;
  isOverride: boolean;
};

export type TeacherMinuteState = {
  availability: AvailabilityType | null;
  isOverride: boolean;
};

export type TeacherAvailabilityRef = {
  teacher: AvailabilityTeacher;
  segments: AvailabilityTimelineSegment[];
};

export type AvailabilityCountSegment = MinuteRange & {
  available: number;
  unavailable: number;
};

const DAY_RANGE_MINUTES = DAY_END_MINUTES - DAY_START_MINUTES;

function clampMinuteRange(startMinute: number, endMinute: number): MinuteRange | null {
  const clampedStart = Math.max(startMinute, DAY_START_MINUTES);
  const clampedEnd = Math.min(endMinute, DAY_END_MINUTES);

  if (clampedStart >= clampedEnd) {
    return null;
  }

  return {
    startMinute: clampedStart,
    endMinute: clampedEnd,
  };
}

function getMinuteOffsetFromDayStart(value: Date, dayStart: Date): number {
  return differenceInMinutes(value, dayStart);
}

function rangesOverlap(left: MinuteRange, right: MinuteRange): boolean {
  return left.startMinute < right.endMinute && left.endMinute > right.startMinute;
}

function getTeacherDayOverrides(
  teacher: AvailabilityTeacher,
  weekStart: Date,
  dayOfWeek: number,
): OverrideMinuteRange[] {
  const dayStart = startOfDay(addDays(weekStart, dayOfWeek - 1));
  const dayEnd = addDays(dayStart, 1);

  return teacher.overrides
    .filter((entry) => {
      const start = entry.startTime;
      const end = entry.endTime;
      return start < dayEnd && end > dayStart;
    })
    .map((entry) => {
      const range = clampMinuteRange(
        getMinuteOffsetFromDayStart(entry.startTime, dayStart),
        getMinuteOffsetFromDayStart(entry.endTime, dayStart),
      );

      return range ? { ...entry, ...range } : null;
    })
    .filter((entry): entry is OverrideMinuteRange => Boolean(entry))
    .sort((left, right) => left.startMinute - right.startMinute);
}

export function getTeacherDayAvailabilitySegments(
  teacher: AvailabilityTeacher,
  weekStart: Date,
  dayOfWeek: number,
): AvailabilityTimelineSegment[] {
  const templateRanges = getTeacherDayEntries(teacher, dayOfWeek)
    .map((entry) => {
      const range = clampMinuteRange(entry.startTime, entry.endTime);
      return range ? { ...entry, ...range } : null;
    })
    .filter((entry): entry is AvailabilityTemplateEntry & MinuteRange => Boolean(entry));
  const overrideRanges = getTeacherDayOverrides(teacher, weekStart, dayOfWeek);

  const points = Array.from(
    new Set([
      DAY_START_MINUTES,
      DAY_END_MINUTES,
      ...templateRanges.flatMap((entry) => [entry.startMinute, entry.endMinute]),
      ...overrideRanges.flatMap((entry) => [entry.startMinute, entry.endMinute]),
    ]),
  ).sort((left, right) => left - right);

  const segments: AvailabilityTimelineSegment[] = [];

  for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
    const startMinute = points[pointIndex];
    const endMinute = points[pointIndex + 1];

    if (startMinute >= endMinute) {
      continue;
    }

    const currentRange = { startMinute, endMinute };
    const activeOverride = overrideRanges.filter((entry) => rangesOverlap(entry, currentRange)).at(-1);
    const activeTemplate = templateRanges.find((entry) => rangesOverlap(entry, currentRange));

    if (!activeOverride && !activeTemplate) {
      continue;
    }

    const nextSegment: AvailabilityTimelineSegment = {
      startMinute,
      endMinute,
      type: activeOverride?.type ?? activeTemplate?.type ?? "AVAILABLE",
      isOverride: Boolean(activeOverride),
    };

    const previousSegment = segments.at(-1);
    if (
      previousSegment
      && previousSegment.endMinute === nextSegment.startMinute
      && previousSegment.type === nextSegment.type
      && previousSegment.isOverride === nextSegment.isOverride
    ) {
      previousSegment.endMinute = nextSegment.endMinute;
      continue;
    }

    segments.push(nextSegment);
  }

  return segments;
}

export function getTeacherMinuteState(
  segments: AvailabilityTimelineSegment[],
  minute: number,
): TeacherMinuteState {
  const availabilitySegment = segments.find(
    (segment) => segment.startMinute <= minute && segment.endMinute > minute,
  ) ?? null;

  return {
    availability: availabilitySegment?.type ?? null,
    isOverride: availabilitySegment?.isOverride ?? false,
  };
}

export function buildMinuteBreakdown(
  teacherAvailabilityRefs: TeacherAvailabilityRef[],
  minute: number,
): SlotBreakdown {
  const breakdown: SlotBreakdown = {
    available: [],
    unavailable: [],
    unmarked: [],
  };

  teacherAvailabilityRefs.forEach(({ teacher, segments }) => {
    const state = getTeacherMinuteState(segments, minute);
    const teacherState: SlotTeacherState = {
      teacherId: teacher.teacherId,
      teacherName: teacher.fullName,
    };

    if (state.availability === "AVAILABLE" || state.availability === "PREFERRED") {
      breakdown.available.push(teacherState);
      return;
    }

    if (state.availability === "UNAVAILABLE") {
      breakdown.unavailable.push(teacherState);
      return;
    }

    breakdown.unmarked.push(teacherState);
  });

  return breakdown;
}

export function buildAvailabilityCountSegments(
  teacherAvailabilityRefs: TeacherAvailabilityRef[],
): AvailabilityCountSegment[] {
  if (teacherAvailabilityRefs.length === 0) {
    return [];
  }

  const points = Array.from(
    new Set([
      DAY_START_MINUTES,
      DAY_END_MINUTES,
      ...teacherAvailabilityRefs.flatMap(({ segments }) =>
        segments.flatMap((segment) => [segment.startMinute, segment.endMinute]),
      ),
    ]),
  ).sort((left, right) => left - right);

  const countSegments: AvailabilityCountSegment[] = [];

  for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
    const startMinute = points[pointIndex];
    const endMinute = points[pointIndex + 1];

    if (startMinute >= endMinute) {
      continue;
    }

    const breakdown = buildMinuteBreakdown(teacherAvailabilityRefs, startMinute);
    const nextSegment: AvailabilityCountSegment = {
      startMinute,
      endMinute,
      available: breakdown.available.length,
      unavailable: breakdown.unavailable.length,
    };

    const previousSegment = countSegments.at(-1);
    if (
      previousSegment
      && previousSegment.endMinute === nextSegment.startMinute
      && previousSegment.available === nextSegment.available
      && previousSegment.unavailable === nextSegment.unavailable
    ) {
      previousSegment.endMinute = nextSegment.endMinute;
      continue;
    }

    countSegments.push(nextSegment);
  }

  return countSegments;
}

export function minuteToTimelinePercent(minute: number): number {
  return ((minute - DAY_START_MINUTES) / DAY_RANGE_MINUTES) * 100;
}

export function durationToTimelinePercent(durationMinutes: number): number {
  return (durationMinutes / DAY_RANGE_MINUTES) * 100;
}
