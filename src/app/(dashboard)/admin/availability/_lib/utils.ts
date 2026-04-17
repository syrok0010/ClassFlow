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
export const SLOT_MINUTES = 30;
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

export function startOfWeek(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);

  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);

  return date;
}

export function addDays(value: Date, amount: number): Date {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getWeekEndExclusive(weekStartIso: string): string {
  return toIsoDate(addDays(new Date(`${weekStartIso}T00:00:00`), 7));
}

export function getWeekRangeLabel(weekStartIso: string): string {
  const start = new Date(`${weekStartIso}T00:00:00`);
  const end = addDays(start, 6);

  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: sameMonth ? undefined : "long",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(end);

  return `${startLabel} - ${endLabel}`;
}

export function getDayDate(weekStartIso: string, dayOfWeek: number): Date {
  return addDays(new Date(`${weekStartIso}T00:00:00`), dayOfWeek - 1);
}

export function getDayDateLabel(weekStartIso: string, dayOfWeek: number): string {
  const date = getDayDate(weekStartIso, dayOfWeek);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

export function formatTimeFromDateTime(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const startLabel = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(end);

  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
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
    .sort((left, right) => timeToMinutes(left.startTime) - timeToMinutes(right.startTime));
}

export function getTeacherOverrideEntriesForWeek(
  teacher: AvailabilityTeacher,
  weekStartIso: string,
): AvailabilityOverrideEntry[] {
  const weekStart = new Date(`${weekStartIso}T00:00:00`);
  const weekEnd = addDays(weekStart, 7);

  return teacher.overrides
    .filter((entry) => {
      const start = new Date(entry.startTime);
      const end = new Date(entry.endTime);
      return start < weekEnd && end > weekStart;
    })
    .sort((left, right) => left.startTime.localeCompare(right.startTime));
}

export function hasWeekOverride(teacher: AvailabilityTeacher, weekStartIso: string): boolean {
  return getTeacherOverrideEntriesForWeek(teacher, weekStartIso).length > 0;
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
      .map((entry, index) => ({
        ...entry,
        _index: index,
        startMinutes: timeToMinutes(entry.startTime),
        endMinutes: timeToMinutes(entry.endTime),
      }))
      .filter((entry) => entry.startMinutes < entry.endMinutes);

    if (dayEntries.length === 0) {
      continue;
    }

    const points = Array.from(
      new Set(dayEntries.flatMap((entry) => [entry.startMinutes, entry.endMinutes])),
    ).sort((left, right) => left - right);

    for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
      const segmentStart = points[pointIndex];
      const segmentEnd = points[pointIndex + 1];
      const overlapping = dayEntries.filter(
        (entry) => entry.startMinutes < segmentEnd && entry.endMinutes > segmentStart,
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
        && previous.endTime === minutesToTime(segmentStart)
      ) {
        previous.endTime = minutesToTime(segmentEnd);
        continue;
      }

      normalized.push({
        dayOfWeek: day.dayOfWeek,
        startTime: minutesToTime(segmentStart),
        endTime: minutesToTime(segmentEnd),
        type: active.type,
      });
    }
  }

  return normalized;
}

export function combineDateAndTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

export function createTemplateEntryId(entry: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: AvailabilityType;
}): string {
  return `${entry.dayOfWeek}:${entry.startTime}:${entry.endTime}:${entry.type}`;
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
  finalAvailability: AvailabilityType | null;
  isOverride: boolean;
};

export type TeacherTimelineRef = {
  teacher: AvailabilityTeacher;
  segments: AvailabilityTimelineSegment[];
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
  return Math.round((value.getTime() - dayStart.getTime()) / 60_000);
}

function rangesOverlap(left: MinuteRange, right: MinuteRange): boolean {
  return left.startMinute < right.endMinute && left.endMinute > right.startMinute;
}

function getTeacherDayOverrides(
  teacher: AvailabilityTeacher,
  weekStartIso: string,
  dayOfWeek: number,
): OverrideMinuteRange[] {
  const dayStart = getDayDate(weekStartIso, dayOfWeek);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = addDays(dayStart, 1);

  return teacher.overrides
    .filter((entry) => {
      const start = new Date(entry.startTime);
      const end = new Date(entry.endTime);
      return start < dayEnd && end > dayStart;
    })
    .map((entry) => {
      const range = clampMinuteRange(
        getMinuteOffsetFromDayStart(new Date(entry.startTime), dayStart),
        getMinuteOffsetFromDayStart(new Date(entry.endTime), dayStart),
      );

      return range ? { ...entry, ...range } : null;
    })
    .filter((entry): entry is OverrideMinuteRange => Boolean(entry))
    .sort((left, right) => left.startMinute - right.startMinute);
}

function buildEffectiveAvailabilitySegments(
  teacher: AvailabilityTeacher,
  weekStartIso: string,
  dayOfWeek: number,
): AvailabilityTimelineSegment[] {
  const templateRanges = getTeacherDayEntries(teacher, dayOfWeek)
    .map((entry) => {
      const range = clampMinuteRange(
        timeToMinutes(entry.startTime),
        timeToMinutes(entry.endTime),
      );

      return range ? { ...entry, ...range } : null;
    })
    .filter((entry): entry is AvailabilityTemplateEntry & MinuteRange => Boolean(entry));
  const overrideRanges = getTeacherDayOverrides(teacher, weekStartIso, dayOfWeek);

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

export function getTeacherDayAvailabilitySegments(
  teacher: AvailabilityTeacher,
  weekStartIso: string,
  dayOfWeek: number,
): AvailabilityTimelineSegment[] {
  return buildEffectiveAvailabilitySegments(teacher, weekStartIso, dayOfWeek);
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
    finalAvailability: availabilitySegment?.type ?? null,
    isOverride: availabilitySegment?.isOverride ?? false,
  };
}

export function buildMinuteBreakdown(
  teacherTimelineRefs: TeacherTimelineRef[],
  minute: number,
): SlotBreakdown {
  const slotStateEntries: SlotTeacherState[] = teacherTimelineRefs.map(({ teacher, segments }) => {
    const state = getTeacherMinuteState(segments, minute);

    if (state.finalAvailability === "AVAILABLE" || state.finalAvailability === "PREFERRED") {
      return {
        teacherId: teacher.teacherId,
        teacherName: teacher.fullName,
        state: "free",
      };
    }

    if (state.finalAvailability === "UNAVAILABLE") {
      return {
        teacherId: teacher.teacherId,
        teacherName: teacher.fullName,
        state: "unavailable",
      };
    }

    return {
      teacherId: teacher.teacherId,
      teacherName: teacher.fullName,
      state: "unmarked",
    };
  });

  return {
    free: slotStateEntries.filter((entry) => entry.state === "free"),
    unavailable: slotStateEntries.filter((entry) => entry.state === "unavailable"),
    unmarked: slotStateEntries.filter((entry) => entry.state === "unmarked"),
  };
}

export function minuteToTimelinePercent(minute: number): number {
  return ((minute - DAY_START_MINUTES) / DAY_RANGE_MINUTES) * 100;
}

export function durationToTimelinePercent(durationMinutes: number): number {
  return (durationMinutes / DAY_RANGE_MINUTES) * 100;
}
