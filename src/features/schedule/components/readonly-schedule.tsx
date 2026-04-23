"use client"

import * as React from "react"
import { useMemo } from "react"

import { cn } from "@/lib/utils"

import { buildScheduleLayout } from "../lib/layout"
import { formatTimeLabel } from "../lib/date-utils"
import type {
  BaseScheduleEvent,
  ScheduleTimeRange,
  ScheduleViewMode
} from "../lib/types"
import {EmptyStateConfig, FilterableEmptyState} from "@/components/ui/filterable-empty-state";

const TIME_COLUMN_WIDTH_PX = 72
const ROW_COLUMN_WIDTH_PX = 112
const MIN_DAY_COLUMN_WIDTH_PX = 208

interface ReadonlyScheduleRow {
  id: string
  label: React.ReactNode
}

interface ReadonlyScheduleProps<TEvent extends BaseScheduleEvent> {
  events: readonly TEvent[]
  anchorDate: Date
  viewMode: ScheduleViewMode
  renderEvent: (event: TEvent) => React.ReactNode
  emptyState: EmptyStateConfig
  rows?: readonly ReadonlyScheduleRow[]
  getEventRowId?: (event: TEvent) => string
  rowColumnTitle?: string
  weekDaysCount?: number
  timeRange?: ScheduleTimeRange
  className?: string
}

export function ReadonlySchedule<TEvent extends BaseScheduleEvent>({
  events,
  anchorDate,
  viewMode,
  renderEvent,
  emptyState,
  rows,
  getEventRowId,
  rowColumnTitle = "Класс",
  timeRange,
  className,
}: ReadonlyScheduleProps<TEvent>) {
  const layout = useMemo(
    () =>
      buildScheduleLayout({
        events,
        anchorDate,
        viewMode,
        timeRange,
      }),
    [anchorDate, events, timeRange, viewMode]
  )

  const rowLayouts = useMemo(() => {
    if (!rows || rows.length === 0 || !getEventRowId) {
      return null
    }

    const fixedTimeRange: ScheduleTimeRange = {
      start: formatTimeLabel(layout.timeRange.startMinutes),
      end: formatTimeLabel(layout.timeRange.endMinutes),
      stepMinutes: timeRange?.stepMinutes,
    }

    return rows.map((row) => ({
      row,
      layout: buildScheduleLayout({
        events: events.filter((event) => getEventRowId(event) === row.id),
        anchorDate,
        viewMode,
        timeRange: fixedTimeRange,
      }),
    }))
  }, [anchorDate, events, getEventRowId, layout.timeRange.endMinutes, layout.timeRange.startMinutes, rows, timeRange?.stepMinutes, viewMode])

  const hasRows = Boolean(rows && rows.length > 0 && getEventRowId)

  if (!layout.hasVisibleEvents && !hasRows) {
    return (
      <div
        data-slot="readonly-schedule"
        className={cn(
          "rounded-xl border bg-card text-card-foreground shadow-sm",
          className
        )}
      >
        <FilterableEmptyState hasFilters={false} empty={emptyState}/>
      </div>
    )
  }

  const dayCount = layout.days.length
  const gridTemplateColumns = `${TIME_COLUMN_WIDTH_PX}px repeat(${dayCount}, minmax(${MIN_DAY_COLUMN_WIDTH_PX}px, 1fr))`
  const rowGridTemplateColumns = `${ROW_COLUMN_WIDTH_PX}px ${TIME_COLUMN_WIDTH_PX}px repeat(${dayCount}, minmax(${MIN_DAY_COLUMN_WIDTH_PX}px, 1fr))`
  const minGridWidth = TIME_COLUMN_WIDTH_PX + dayCount * MIN_DAY_COLUMN_WIDTH_PX
  const groupedMinGridWidth = ROW_COLUMN_WIDTH_PX + TIME_COLUMN_WIDTH_PX + dayCount * MIN_DAY_COLUMN_WIDTH_PX

  if (rowLayouts) {
    return (
      <div
        data-slot="readonly-schedule"
        className={cn(
          "overflow-x-auto rounded-xl border bg-card text-card-foreground shadow-sm",
          className
        )}
      >
        <div className="min-w-max" style={{ minWidth: `${groupedMinGridWidth}px` }}>
          <div
            className="grid border-b bg-muted/30"
            style={{ gridTemplateColumns: rowGridTemplateColumns }}
          >
            <div
              data-slot="schedule-corner"
              className="border-r px-3 py-4 text-xs font-medium text-muted-foreground"
            >
              {rowColumnTitle}
            </div>
            <div className="border-r px-3 py-4 text-xs font-medium text-muted-foreground">
              Время
            </div>

            {layout.days.map((day) => (
              <div
                key={day.key}
                data-slot="schedule-day-header"
                className={cn(
                  "border-r px-4 py-3 text-center last:border-r-0",
                  day.isToday && "bg-accent/50"
                )}
              >
                <div className="text-sm font-semibold capitalize">{day.weekdayLabel}</div>
                <div className="text-xs text-muted-foreground">{day.dateLabel}</div>
              </div>
            ))}
          </div>

          {rowLayouts.map(({ row, layout: rowLayout }) => (
            <div
              key={row.id}
              className="grid border-b last:border-b-0"
              style={{ gridTemplateColumns: rowGridTemplateColumns }}
            >
              <div
                className="flex items-start border-r bg-muted/5 px-2 py-3"
                style={{ height: `${rowLayout.timeRange.heightPx}px` }}
              >
                <span className="text-sm font-semibold text-foreground">{row.label}</span>
              </div>

              <div
                data-slot="schedule-time-column"
                className="relative border-r bg-muted/10"
                style={{ height: `${rowLayout.timeRange.heightPx}px` }}
              >
                {rowLayout.timeSlots.map((slot) => (
                  <div
                    key={slot.key}
                    data-slot="schedule-time-slot"
                    className="absolute inset-x-0"
                    style={{ top: `${slot.offsetPx}px` }}
                  >
                    <div
                      className={cn(
                        "border-t",
                        slot.kind === "hour"
                          ? "border-border"
                          : slot.kind === "halfHour"
                            ? "border-border/60"
                            : "border-border/30"
                      )}
                    />
                    {slot.kind === "hour" ? (
                      <span
                        className={cn(
                          "absolute right-2 text-xs text-muted-foreground",
                          slot.minutes === rowLayout.timeRange.startMinutes
                            ? "top-1"
                            : "-top-2 -translate-y-1/2"
                        )}
                      >
                        {slot.label}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              {rowLayout.days.map((day) => {
                const positionedEvents = rowLayout.eventsByDay[day.key] ?? []

                return (
                  <div
                    key={`${row.id}-${day.key}`}
                    data-slot="schedule-day-column"
                    aria-label={`${day.fullLabel}, ${String(row.label)}`}
                    className="relative border-r last:border-r-0"
                    style={{ height: `${rowLayout.timeRange.heightPx}px` }}
                  >
                    {rowLayout.timeSlots.map((slot) => (
                      <div
                        key={`${row.id}-${day.key}-${slot.key}`}
                        data-slot="schedule-grid-line"
                        className={cn(
                          "absolute inset-x-0 border-t",
                          slot.kind === "hour"
                            ? "border-border"
                            : slot.kind === "halfHour"
                              ? "border-border/60"
                              : "border-border/30"
                        )}
                        style={{ top: `${slot.offsetPx}px` }}
                      />
                    ))}

                    <div
                      data-slot="schedule-event-layer"
                      className="absolute inset-0"
                    >
                      {positionedEvents.map((event) => (
                        <div
                          key={event.id}
                          data-slot="schedule-event"
                          className="absolute box-border overflow-hidden"
                          style={{
                            top: `${event.topPx}px`,
                            height: `${event.heightPx}px`,
                            left: `${event.leftPercent}%`,
                            width: `${event.widthPercent}%`,
                          }}
                        >
                          <div className="h-full w-full overflow-hidden">
                            {renderEvent(event.source)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="readonly-schedule"
      className={cn(
        "overflow-x-auto rounded-xl border bg-card text-card-foreground shadow-sm",
        className
      )}
    >
      <div className="min-w-max" style={{ minWidth: `${minGridWidth}px` }}>
        <div
          className="grid border-b bg-muted/30"
          style={{ gridTemplateColumns }}
        >
          <div
            data-slot="schedule-corner"
            className="border-r px-3 py-4 text-xs font-medium text-muted-foreground"
          >
            Время
          </div>

          {layout.days.map((day) => (
            <div
              key={day.key}
              data-slot="schedule-day-header"
              className={cn(
                "border-r px-4 py-3 text-center last:border-r-0",
                day.isToday && "bg-accent/50"
              )}
            >
              <div className="text-sm font-semibold capitalize">{day.weekdayLabel}</div>
              <div className="text-xs text-muted-foreground">{day.dateLabel}</div>
            </div>
          ))}
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns }}
        >
          <div
            data-slot="schedule-time-column"
            className="relative border-r bg-muted/10"
            style={{ height: `${layout.timeRange.heightPx}px` }}
          >
            {layout.timeSlots.map((slot) => (
              <div
                key={slot.key}
                data-slot="schedule-time-slot"
                className="absolute inset-x-0"
                style={{ top: `${slot.offsetPx}px` }}
              >
                <div
                  className={cn(
                    "border-t",
                    slot.kind === "hour"
                      ? "border-border"
                      : slot.kind === "halfHour"
                        ? "border-border/60"
                        : "border-border/30"
                  )}
                />
                {slot.kind === "hour" ? (
                  <span
                    className={cn(
                      "absolute right-2 text-xs text-muted-foreground",
                      slot.minutes === layout.timeRange.startMinutes
                        ? "top-1"
                        : "-top-2 -translate-y-1/2"
                    )}
                  >
                    {slot.label}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          {layout.days.map((day) => {
            const positionedEvents = layout.eventsByDay[day.key] ?? []

            return (
              <div
                key={day.key}
                data-slot="schedule-day-column"
                aria-label={day.fullLabel}
                className="relative border-r last:border-r-0"
                style={{ height: `${layout.timeRange.heightPx}px` }}
              >
                {layout.timeSlots.map((slot) => (
                  <div
                    key={slot.key}
                    data-slot="schedule-grid-line"
                    className={cn(
                      "absolute inset-x-0 border-t",
                      slot.kind === "hour"
                        ? "border-border"
                        : slot.kind === "halfHour"
                          ? "border-border/60"
                          : "border-border/30"
                    )}
                    style={{ top: `${slot.offsetPx}px` }}
                  />
                ))}

                <div
                  data-slot="schedule-event-layer"
                  className="absolute inset-0 left-1 right-1"
                >
                  {positionedEvents.map((event) => (
                    <div
                      key={event.id}
                      data-slot="schedule-event"
                      className="absolute box-border overflow-hidden"
                      style={{
                        top: `${event.topPx}px`,
                        height: `${event.heightPx}px`,
                        left: `${event.leftPercent}%`,
                        width: `${event.widthPercent}%`,
                      }}
                    >
                      <div className="h-full w-full overflow-hidden">
                        {renderEvent(event.source)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
