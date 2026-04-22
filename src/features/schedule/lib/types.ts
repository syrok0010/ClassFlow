export interface BaseScheduleEvent {
  id: string
  start: Date
  end: Date
}

export type ScheduleViewMode = "day" | "week"

export type GridMarkKind = "hour" | "halfHour" | "minor"

export interface ScheduleTimeRange {
  start: string
  end: string
  stepMinutes?: number
}

export interface ScheduleDay {
  key: string
  date: Date
  weekdayLabel: string
  dateLabel: string
  fullLabel: string
  isToday: boolean
}

export interface ScheduleSlot {
  key: string
  minutes: number
  offsetPx: number
  label: string
  kind: GridMarkKind
}

export interface ResolvedTimeRange {
  startMinutes: number
  endMinutes: number
  stepMinutes: number
}

export interface EffectiveTimeRange extends ResolvedTimeRange {
  totalMinutes: number
  heightPx: number
}

export interface NormalizedScheduleEvent<TEvent extends BaseScheduleEvent> {
  source: TEvent
  id: string
  start: Date
  end: Date
  dayKey: string
  startMinutes: number
  endMinutes: number
}

export interface PositionedScheduleEvent<TEvent extends BaseScheduleEvent> {
  source: TEvent
  id: string
  dayKey: string
  topPx: number
  heightPx: number
  leftPercent: number
  widthPercent: number
}

export interface ScheduleLayout<TEvent extends BaseScheduleEvent> {
  days: ScheduleDay[]
  timeSlots: ScheduleSlot[]
  timeRange: EffectiveTimeRange
  eventsByDay: Record<string, PositionedScheduleEvent<TEvent>[]>
  hasVisibleEvents: boolean
}

export class ScheduleDataError extends Error {
  constructor(message: string, public eventId?: string) {
    super(eventId ? `[Event ID: ${eventId}] ${message}` : message);
    this.name = "ScheduleDataError";
  }
}
