import { addDays, format, isSameDay, isValid, startOfDay, startOfWeek } from "date-fns"

import type {ScheduleDay, ResolvedTimeRange, ScheduleTimeRange, ScheduleViewMode, GridMarkKind} from "./types"

export const TIME_SLOT_STEP_MINUTES = 5

export const DEFAULT_TIME_RANGE: Required<ScheduleTimeRange> = {
  start: "08:00",
  end: "18:00",
  stepMinutes: TIME_SLOT_STEP_MINUTES,
}

export const MINUTES_IN_DAY = 24 * 60

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
})

const DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
})

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
})

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function getMinutesSinceStartOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

export function parseTimeString(value: string): number | null {
  const match = TIME_PATTERN.exec(value)

  if (!match) {
    return null
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  return hours * 60 + minutes
}

export function formatDayHeader(date: Date) {
  return {
    weekdayLabel: WEEKDAY_FORMATTER.format(date).replace(".", ""),
    dateLabel: DATE_FORMATTER.format(date),
    fullLabel: FULL_DATE_FORMATTER.format(date),
  }
}

export function formatTimeLabel(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.min(MINUTES_IN_DAY, totalMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function normalizeStepMinutes(value?: number): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return DEFAULT_TIME_RANGE.stepMinutes
  }

  if (value < TIME_SLOT_STEP_MINUTES || value > 60 || value % TIME_SLOT_STEP_MINUTES !== 0) {
    return DEFAULT_TIME_RANGE.stepMinutes
  }

  return value
}

export function resolveTimeRange(timeRange?: ScheduleTimeRange): ResolvedTimeRange {
  const startMinutes = parseTimeString(timeRange?.start ?? DEFAULT_TIME_RANGE.start)
  const endMinutes = parseTimeString(timeRange?.end ?? DEFAULT_TIME_RANGE.end)
  const stepMinutes = normalizeStepMinutes(timeRange?.stepMinutes)

  if (
    startMinutes === null ||
    endMinutes === null ||
    startMinutes >= endMinutes ||
    startMinutes < 0 ||
    endMinutes > MINUTES_IN_DAY
  ) {
    return {
      startMinutes: parseTimeString(DEFAULT_TIME_RANGE.start) ?? 8 * 60,
      endMinutes: parseTimeString(DEFAULT_TIME_RANGE.end) ?? 18 * 60,
      stepMinutes: DEFAULT_TIME_RANGE.stepMinutes,
    }
  }

  return {
    startMinutes,
    endMinutes,
    stepMinutes,
  }
}

export function buildVisibleDays(
  anchorDate: Date,
  viewMode: ScheduleViewMode
): ScheduleDay[] {
  const safeAnchorDate = isValid(anchorDate) ? anchorDate : new Date()
  const startDate =
    viewMode === "week"
      ? startOfWeek(safeAnchorDate, { weekStartsOn: 1 })
      : startOfDay(safeAnchorDate)
  const totalDays = viewMode === "week" ? 5 : 1
  const today = startOfDay(new Date())

  return Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(startDate, index)
    const labels = formatDayHeader(date)

    return {
      key: format(date, "yyyy-MM-dd"),
      date,
      weekdayLabel: labels.weekdayLabel,
      dateLabel: labels.dateLabel,
      fullLabel: labels.fullLabel,
      isToday: isSameDay(date, today),
    }
  })
}

export function floorMinutesToStep(minutes: number, stepMinutes: number): number {
  return Math.floor(minutes / stepMinutes) * stepMinutes
}

export function ceilMinutesToStep(minutes: number, stepMinutes: number): number {
  return Math.ceil(minutes / stepMinutes) * stepMinutes
}

export function buildEffectiveTimeRange(
  baseRange: ResolvedTimeRange,
  events: Array<{ startMinutes: number; endMinutes: number }>
): ResolvedTimeRange & { totalMinutes: number } {
  let startMinutes = baseRange.startMinutes
  let endMinutes = baseRange.endMinutes

  if (events.length > 0) {
    const earliestEvent = Math.min(...events.map((event) => event.startMinutes))
    const latestEvent = Math.max(...events.map((event) => event.endMinutes))

    startMinutes = Math.min(
      startMinutes,
      floorMinutesToStep(earliestEvent, baseRange.stepMinutes)
    )
    endMinutes = Math.max(
      endMinutes,
      ceilMinutesToStep(latestEvent, baseRange.stepMinutes)
    )
  }

  startMinutes = Math.max(0, startMinutes)
  endMinutes = Math.min(MINUTES_IN_DAY, endMinutes)

  if (startMinutes >= endMinutes) {
    startMinutes = baseRange.startMinutes
    endMinutes = baseRange.endMinutes
  }

  const totalMinutes = endMinutes - startMinutes

  return {
    startMinutes,
    endMinutes,
    stepMinutes: baseRange.stepMinutes,
    totalMinutes,
  }
}

export function buildTimeSlots(
  timeRange: ResolvedTimeRange
): Array<{
  key: string
  minutes: number
  offsetMinutes: number
  label: string
  kind: GridMarkKind
}> {
  const slots: Array<{
    key: string
    minutes: number
    offsetMinutes: number
    label: string
    kind: GridMarkKind
  }> = []

  for (
    let minutes = timeRange.startMinutes;
    minutes < timeRange.endMinutes;
    minutes += timeRange.stepMinutes
  ) {
    const kind = getSlotKind(minutes)

    slots.push({
      key: `slot-${minutes}`,
      minutes,
      offsetMinutes: minutes - timeRange.startMinutes,
      label: formatTimeLabel(minutes),
      kind,
    })
  }

  const lastSlot = slots.at(-1)

  if (!lastSlot || lastSlot.minutes !== timeRange.endMinutes) {
    const kind = getSlotKind(timeRange.endMinutes)

    slots.push({
      key: `slot-${timeRange.endMinutes}`,
      minutes: timeRange.endMinutes,
      offsetMinutes: timeRange.endMinutes - timeRange.startMinutes,
      label: formatTimeLabel(timeRange.endMinutes),
      kind,
    })
  }

  return slots
}

function getSlotKind(minutes: number): GridMarkKind {
  if (minutes % 60 === 0) {
    return "hour"
  }

  if (minutes % 60 === 30) {
    return "halfHour"
  }

  return "minor"
}
