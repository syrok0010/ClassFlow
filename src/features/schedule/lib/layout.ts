import { format, isSameDay, isValid } from "date-fns"

import {
  buildEffectiveTimeRange,
  buildTimeSlots,
  buildVisibleDays,
  getMinutesSinceStartOfDay,
  resolveTimeRange,
} from "./date-utils"
import type {
  BaseScheduleEvent,
  EffectiveTimeRange,
  NormalizedScheduleEvent,
  PositionedScheduleEvent,
  ScheduleLayout,
  ScheduleSlot,
  ScheduleTimeRange,
  ScheduleViewMode,
} from "./types"

type LayoutInput<TEvent extends BaseScheduleEvent> = {
  events: readonly TEvent[]
  anchorDate: Date
  viewMode: ScheduleViewMode
  timeRange?: ScheduleTimeRange
}

const PIXEL_PER_MINUTE = 2

export function buildScheduleLayout<TEvent extends BaseScheduleEvent>({
  events,
  anchorDate,
  viewMode,
  timeRange,
}: LayoutInput<TEvent>): ScheduleLayout<TEvent> {
  const days = buildVisibleDays(anchorDate, viewMode)
  const dayKeys = new Set(days.map((day) => day.key))
  const baseRange = resolveTimeRange(timeRange)
  const normalizedEvents = normalizeEvents(events, dayKeys)
  const effectiveTimeRange = buildEffectiveTimeRange(baseRange, normalizedEvents)
  const timeRangePx: EffectiveTimeRange = {
    ...effectiveTimeRange,
    heightPx: effectiveTimeRange.totalMinutes * PIXEL_PER_MINUTE,
  }
  const timeSlots: ScheduleSlot[] = buildTimeSlots(effectiveTimeRange).map(
    ({ offsetMinutes, ...slot }) => ({
      ...slot,
      offsetPx: offsetMinutes * PIXEL_PER_MINUTE,
    })
  )
  const eventsByDay = Object.fromEntries(
    days.map((day) => [day.key, [] as PositionedScheduleEvent<TEvent>[]])
  ) as Record<string, PositionedScheduleEvent<TEvent>[]>

  for (const day of days) {
    const dayEvents = normalizedEvents.filter((event) => event.dayKey === day.key)
    eventsByDay[day.key] = positionEvents(dayEvents, effectiveTimeRange.startMinutes)
  }

  return {
    days,
    timeSlots,
    timeRange: timeRangePx,
    eventsByDay,
    hasVisibleEvents: normalizedEvents.length > 0,
  }
}

function normalizeEvents<TEvent extends BaseScheduleEvent>(
  events: readonly TEvent[],
  dayKeys: Set<string>
): NormalizedScheduleEvent<TEvent>[] {
  return events.flatMap((event) => {
    if (!isValid(event.start) || !isValid(event.end)) {
      return []
    }

    if (event.end <= event.start || !isSameDay(event.start, event.end)) {
      return []
    }

    const startMinutes = getMinutesSinceStartOfDay(event.start)
    const endMinutes = getMinutesSinceStartOfDay(event.end)
    const durationMinutes = endMinutes - startMinutes

    if (
      startMinutes % 5 !== 0 ||
      endMinutes % 5 !== 0 ||
      durationMinutes < 10 ||
      durationMinutes > 60 ||
      durationMinutes % 5 !== 0
    ) {
      return []
    }

    const dayKey = format(event.start, "yyyy-MM-dd")

    if (!dayKeys.has(dayKey)) {
      return []
    }

    return [
      {
        source: event,
        id: event.id,
        start: event.start,
        end: event.end,
        dayKey,
        startMinutes,
        endMinutes,
      },
    ]
  })
}

function positionEvents<TEvent extends BaseScheduleEvent>(
  events: NormalizedScheduleEvent<TEvent>[],
  rangeStartMinutes: number
): PositionedScheduleEvent<TEvent>[] {
  const sortedEvents = [...events].sort((left, right) => {
    if (left.start.getTime() !== right.start.getTime()) {
      return left.start.getTime() - right.start.getTime()
    }

    if (left.end.getTime() !== right.end.getTime()) {
      return right.end.getTime() - left.end.getTime()
    }

    return left.id.localeCompare(right.id)
  })

  const positionedEvents: PositionedScheduleEvent<TEvent>[] = []
  let cluster: NormalizedScheduleEvent<TEvent>[] = []
  let clusterEndMinutes = -1

  for (const event of sortedEvents) {
    if (cluster.length === 0 || event.startMinutes < clusterEndMinutes) {
      cluster.push(event)
      clusterEndMinutes = Math.max(clusterEndMinutes, event.endMinutes)
      continue
    }

    positionedEvents.push(...positionCluster(cluster, rangeStartMinutes))
    cluster = [event]
    clusterEndMinutes = event.endMinutes
  }

  if (cluster.length > 0) {
    positionedEvents.push(...positionCluster(cluster, rangeStartMinutes))
  }

  return positionedEvents
}

function positionCluster<TEvent extends BaseScheduleEvent>(
  cluster: NormalizedScheduleEvent<TEvent>[],
  rangeStartMinutes: number
): PositionedScheduleEvent<TEvent>[] {
  const columnEndMinutes: number[] = []
  const assignments = cluster.map((event) => {
    let columnIndex = columnEndMinutes.findIndex(
      (columnEndMinute) => columnEndMinute <= event.startMinutes
    )

    if (columnIndex === -1) {
      columnIndex = columnEndMinutes.length
      columnEndMinutes.push(event.endMinutes)
    } else {
      columnEndMinutes[columnIndex] = event.endMinutes
    }

    return {
      event,
      columnIndex,
    }
  })

  const totalColumns = Math.max(columnEndMinutes.length, 1)

  return assignments.map(({ event, columnIndex }) => ({
    source: event.source,
    id: event.id,
    dayKey: event.dayKey,
    topPx: (event.startMinutes - rangeStartMinutes) * PIXEL_PER_MINUTE,
    heightPx: (event.endMinutes - event.startMinutes) * PIXEL_PER_MINUTE,
    leftPercent: (columnIndex / totalColumns) * 100,
    widthPercent: 100 / totalColumns,
  }))
}
