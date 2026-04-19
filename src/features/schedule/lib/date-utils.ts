import type {
  EffectiveTimeRange,
  ResolvedTimeRange,
  ScheduleDay,
  ScheduleSlot,
  ScheduleTimeRange,
  ScheduleViewMode,
} from "./types"

export const DEFAULT_TIME_RANGE: Required<ScheduleTimeRange> = {
  start: "08:00",
  end: "18:00",
  stepMinutes: 30,
}

export const MINUTES_IN_DAY = 24 * 60
export const PIXELS_PER_MINUTE = 1.2

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

export function isValidDate(value: Date): boolean {
  return Number.isFinite(value.getTime())
}

export function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function getStartOfWeekMonday(date: Date): Date {
  const startOfDay = getStartOfDay(date)
  const dayOfWeek = startOfDay.getDay()
  const daysFromMonday = (dayOfWeek + 6) % 7
  return addDays(startOfDay, -daysFromMonday)
}

export function toDayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function areSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

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

  if (value < 15 || value > 60 || value % 5 !== 0) {
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
  const safeAnchorDate = isValidDate(anchorDate) ? anchorDate : new Date()
  const startDate =
    viewMode === "week"
      ? getStartOfWeekMonday(safeAnchorDate)
      : getStartOfDay(safeAnchorDate)
  const totalDays = viewMode === "week" ? 7 : 1
  const today = getStartOfDay(new Date())

  return Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(startDate, index)
    const labels = formatDayHeader(date)

    return {
      key: toDayKey(date),
      date,
      weekdayLabel: labels.weekdayLabel,
      dateLabel: labels.dateLabel,
      fullLabel: labels.fullLabel,
      isToday: areSameDay(date, today),
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
): EffectiveTimeRange {
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
    heightPx: totalMinutes * PIXELS_PER_MINUTE,
  }
}

export function buildTimeSlots(timeRange: EffectiveTimeRange): ScheduleSlot[] {
  const slots: ScheduleSlot[] = []

  for (
    let minutes = timeRange.startMinutes;
    minutes < timeRange.endMinutes;
    minutes += timeRange.stepMinutes
  ) {
    slots.push({
      key: `slot-${minutes}`,
      minutes,
      offsetPx: (minutes - timeRange.startMinutes) * PIXELS_PER_MINUTE,
      label: formatTimeLabel(minutes),
      isMajor:
        minutes === timeRange.startMinutes ||
        minutes % 60 === 0,
    })
  }

  const lastSlot = slots.at(-1)

  if (!lastSlot || lastSlot.minutes !== timeRange.endMinutes) {
    slots.push({
      key: `slot-${timeRange.endMinutes}`,
      minutes: timeRange.endMinutes,
      offsetPx: (timeRange.endMinutes - timeRange.startMinutes) * PIXELS_PER_MINUTE,
      label: formatTimeLabel(timeRange.endMinutes),
      isMajor: true,
    })
  }

  return slots
}
