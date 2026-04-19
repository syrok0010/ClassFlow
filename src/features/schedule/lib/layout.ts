import {
  areSameDay,
  buildEffectiveTimeRange,
  buildTimeSlots,
  buildVisibleDays,
  getMinutesSinceStartOfDay,
  isValidDate,
  resolveTimeRange,
  toDayKey,
  PIXELS_PER_MINUTE,
} from "./date-utils"
import type {
  BaseScheduleEvent,
  NormalizedScheduleEvent,
  PositionedScheduleEvent,
  ScheduleLayout, ScheduleTimeRange, ScheduleViewMode,
} from "./types"

type LayoutInput<TEvent extends BaseScheduleEvent> = {
  events: readonly TEvent[]
  anchorDate: Date
  viewMode: ScheduleViewMode
  timeRange?: ScheduleTimeRange
}

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
  const timeSlots = buildTimeSlots(effectiveTimeRange)
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
    timeRange: effectiveTimeRange,
    eventsByDay,
    hasVisibleEvents: normalizedEvents.length > 0,
  }
}

function normalizeEvents<TEvent extends BaseScheduleEvent>(
  events: readonly TEvent[],
  dayKeys: Set<string>
): NormalizedScheduleEvent<TEvent>[] {
  return events.flatMap((event) => {
    if (!isValidDate(event.start) || !isValidDate(event.end)) {
      return []
    }

    if (event.end <= event.start || !areSameDay(event.start, event.end)) {
      return []
    }

    const dayKey = toDayKey(event.start)

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
        startMinutes: getMinutesSinceStartOfDay(event.start),
        endMinutes: getMinutesSinceStartOfDay(event.end),
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
    topPx: (event.startMinutes - rangeStartMinutes) * PIXELS_PER_MINUTE,
    heightPx: (event.endMinutes - event.startMinutes) * PIXELS_PER_MINUTE,
    leftPercent: (columnIndex / totalColumns) * 100,
    widthPercent: 100 / totalColumns,
  }))
}
