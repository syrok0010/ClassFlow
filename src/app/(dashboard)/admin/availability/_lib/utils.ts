import type { AvailabilityType } from "@/generated/prisma/enums";
import type {
  AvailabilityOverrideEntry,
  AvailabilityScheduleEntry,
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

function getAvailabilityForSlot(
  templateEntries: AvailabilityTemplateEntry[],
  slotStartMinutes: number,
  slotEndMinutes: number,
): AvailabilityType | null {
  const match = templateEntries.find((entry) => {
    const start = timeToMinutes(entry.startTime);
    const end = timeToMinutes(entry.endTime);
    return start < slotEndMinutes && end > slotStartMinutes;
  });

  return match?.type ?? null;
}

function getOverrideForSlot(
  overrides: AvailabilityOverrideEntry[],
  dateIso: string,
  slotStartMinutes: number,
  slotEndMinutes: number,
): AvailabilityOverrideEntry | null {
  const slotStart = combineDateAndTime(dateIso, minutesToTime(slotStartMinutes));
  const slotEnd = combineDateAndTime(dateIso, minutesToTime(slotEndMinutes));

  const activeOverrides = overrides.filter((entry) => {
    const start = new Date(entry.startTime);
    const end = new Date(entry.endTime);
    return start < slotEnd && end > slotStart;
  });

  return activeOverrides.at(-1) ?? null;
}

function getScheduleForSlot(
  scheduleEntries: AvailabilityScheduleEntry[],
  slotStartMinutes: number,
  slotEndMinutes: number,
): AvailabilityScheduleEntry | null {
  return (
    scheduleEntries.find((entry) => {
      const start = timeToMinutes(formatTimeFromDateTime(entry.startTime));
      const end = timeToMinutes(formatTimeFromDateTime(entry.endTime));
      return start < slotEndMinutes && end > slotStartMinutes;
    }) ?? null
  );
}

export function getTeacherSlotState(
  teacher: AvailabilityTeacher,
  weekStartIso: string,
  dayOfWeek: number,
  slotIndex: number,
): {
  availability: AvailabilityType | null;
  override: AvailabilityOverrideEntry | null;
  schedule: AvailabilityScheduleEntry | null;
  finalAvailability: AvailabilityType | null;
} {
  const slotStartMinutes = DAY_START_MINUTES + slotIndex * SLOT_MINUTES;
  const slotEndMinutes = slotStartMinutes + SLOT_MINUTES;
  const dayDateIso = toIsoDate(getDayDate(weekStartIso, dayOfWeek));
  const templateEntries = getTeacherDayEntries(teacher, dayOfWeek);
  const availability = getAvailabilityForSlot(templateEntries, slotStartMinutes, slotEndMinutes);
  const override = getOverrideForSlot(teacher.overrides, dayDateIso, slotStartMinutes, slotEndMinutes);
  const schedule = getScheduleForSlot(
    teacher.scheduleEntries.filter(
      (entry) => toIsoDate(new Date(entry.startTime)) === dayDateIso,
    ),
    slotStartMinutes,
    slotEndMinutes,
  );

  return {
    availability,
    override,
    schedule,
    finalAvailability: override?.type ?? availability,
  };
}

export function getTeacherConflictSlots(
  teacher: AvailabilityTeacher,
  weekStartIso: string,
): Set<string> {
  const conflicts = new Set<string>();

  for (const day of DAY_CONFIG) {
    for (let slotIndex = 0; slotIndex < SLOT_COUNT; slotIndex += 1) {
      const slot = getTeacherSlotState(teacher, weekStartIso, day.dayOfWeek, slotIndex);
      if (!slot.schedule) {
        continue;
      }

      if (slot.finalAvailability === "UNAVAILABLE") {
        conflicts.add(`${day.dayOfWeek}:${slotIndex}`);
      }
    }
  }

  return conflicts;
}

export function buildSlotBreakdown(
  teachers: AvailabilityTeacher[],
  weekStartIso: string,
  dayOfWeek: number,
  slotIndex: number,
): SlotBreakdown {
  const slotStateEntries: SlotTeacherState[] = teachers.map((teacher) => {
    const slot = getTeacherSlotState(teacher, weekStartIso, dayOfWeek, slotIndex);

    if (slot.schedule) {
      return {
        teacherId: teacher.teacherId,
        teacherName: teacher.fullName,
        state: "busy",
        lessonLabel: `${slot.schedule.groupName} · ${slot.schedule.subjectName}`,
      };
    }

    if (slot.finalAvailability === "AVAILABLE" || slot.finalAvailability === "PREFERRED") {
      return {
        teacherId: teacher.teacherId,
        teacherName: teacher.fullName,
        state: "free",
      };
    }

    if (slot.finalAvailability === "UNAVAILABLE") {
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
    busy: slotStateEntries.filter((entry) => entry.state === "busy"),
    unavailable: slotStateEntries.filter((entry) => entry.state === "unavailable"),
    unmarked: slotStateEntries.filter((entry) => entry.state === "unmarked"),
  };
}
