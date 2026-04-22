"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

import { buildScheduleLayout } from "../lib/layout"
import type {
  BaseScheduleEvent,
  ScheduleTimeRange,
  ScheduleViewMode
} from "../lib/types"
import { useMemo } from "react";
import {EmptyStateConfig, FilterableEmptyState} from "@/components/ui/filterable-empty-state";

const TIME_COLUMN_WIDTH_PX = 72
const MIN_DAY_COLUMN_WIDTH_PX = 208

interface ReadonlyScheduleProps<TEvent extends BaseScheduleEvent> {
  events: readonly TEvent[]
  anchorDate: Date
  viewMode: ScheduleViewMode
  renderEvent: (event: TEvent) => React.ReactNode
  emptyState: EmptyStateConfig
  timeRange?: ScheduleTimeRange
  className?: string
}

export function ReadonlySchedule<TEvent extends BaseScheduleEvent>({
  events,
  anchorDate,
  viewMode,
  renderEvent,
  emptyState,
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

  if (!layout.hasVisibleEvents) {
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
  const minGridWidth = TIME_COLUMN_WIDTH_PX + dayCount * MIN_DAY_COLUMN_WIDTH_PX

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
      </div>
    </div>
  )
}
