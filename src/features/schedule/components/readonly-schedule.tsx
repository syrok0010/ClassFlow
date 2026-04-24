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
const ROW_COLUMN_WIDTH_PX = 72
const MIN_DAY_COLUMN_WIDTH_PX = 208

interface ReadonlyScheduleRow {
  id: string
  label: React.ReactNode
}

interface ReadonlyScheduleProps<TEvent extends BaseScheduleEvent> {
  events: readonly TEvent[]
  anchorDate?: Date | null
  viewMode: ScheduleViewMode
  renderEvent: (event: TEvent) => React.ReactNode
  emptyState: EmptyStateConfig
  rows?: readonly ReadonlyScheduleRow[]
  getEventRowId?: (event: TEvent) => string
  rowColumnTitle?: string
  renderDayColumnOverlay?: (context: {
    dayKey: string
    rowId: string | null
    startMinutes: number
    endMinutes: number
    heightPx: number
  }) => React.ReactNode
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
  renderDayColumnOverlay,
  timeRange,
  className,
}: ReadonlyScheduleProps<TEvent>) {

  const shouldShowDayDates = Boolean(anchorDate)
  const layout = useMemo(
    () =>
      buildScheduleLayout({
        events,
        anchorDate: anchorDate ?? new Date(),
        viewMode,
        timeRange,
      }),
    [events, anchorDate, viewMode, timeRange]
  )

  const hasRows = Boolean(rows && rows.length > 0 && getEventRowId)

  type RowLayoutItem = {
    id: string
    row: ReadonlyScheduleRow | null
    layout: ReturnType<typeof buildScheduleLayout<TEvent>>
  }

  const rowLayouts = useMemo(() => {
    const fixedTimeRange: ScheduleTimeRange = {
      start: formatTimeLabel(layout.timeRange.startMinutes),
      end: formatTimeLabel(layout.timeRange.endMinutes),
      stepMinutes: timeRange?.stepMinutes,
    }

    if (!hasRows || !rows || !getEventRowId) {
      return [
        {
          id: "single-row",
          row: null,
          layout,
        },
      ] satisfies RowLayoutItem[]
    }

    return rows.map((row) => ({
      id: row.id,
      row: row,
      layout: buildScheduleLayout({
        events: events.filter((event) => getEventRowId(event) === row.id),
        anchorDate: anchorDate ?? new Date(),
        viewMode,
        timeRange: fixedTimeRange,
      }),
    })) satisfies RowLayoutItem[]
  }, [
    events,
    getEventRowId,
    hasRows,
    layout,
    anchorDate,
    rows,
    timeRange?.stepMinutes,
    viewMode,
  ])

  const hasVisibleEvents = rowLayouts.some((row) => row.layout.hasVisibleEvents)

  if (!hasVisibleEvents) {
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
  const gridTemplateColumns = hasRows
    ? `${ROW_COLUMN_WIDTH_PX}px ${TIME_COLUMN_WIDTH_PX}px repeat(${dayCount}, minmax(${MIN_DAY_COLUMN_WIDTH_PX}px, 1fr))`
    : `${TIME_COLUMN_WIDTH_PX}px repeat(${dayCount}, minmax(${MIN_DAY_COLUMN_WIDTH_PX}px, 1fr))`
  const minGridWidth = hasRows
    ? ROW_COLUMN_WIDTH_PX + TIME_COLUMN_WIDTH_PX + dayCount * MIN_DAY_COLUMN_WIDTH_PX
    : TIME_COLUMN_WIDTH_PX + dayCount * MIN_DAY_COLUMN_WIDTH_PX

  return (
    <div
      data-slot="readonly-schedule"
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-sm",
        className
      )}
    >
      <div className="min-w-max" style={{ minWidth: `${minGridWidth}px` }}>
        <div
          className="grid border-b bg-muted/30"
          style={{ gridTemplateColumns }}
        >
          {hasRows ? (
            <>
              <div
                data-slot="schedule-corner"
                className="border-r px-3 py-4 text-xs font-medium text-muted-foreground"
              >
                {rowColumnTitle}
              </div>
              <div className="border-r px-3 py-4 text-xs font-medium text-muted-foreground">
                Время
              </div>
            </>
          ) : (
            <div
              data-slot="schedule-corner"
              className="border-r px-3 py-4 text-xs font-medium text-muted-foreground"
            >
              Время
            </div>
          )}

          {layout.days.map((day) => (
            <div
              key={day.key}
              data-slot="schedule-day-header"
              className={cn(
                "border-r px-4 py-3 text-center last:border-r-0",
                day.isToday && anchorDate && "bg-accent/90"
                )}
              >
                <div className="text-sm font-semibold capitalize">{day.weekdayLabel}</div>
                {shouldShowDayDates ? (
                  <div className="text-xs text-muted-foreground">{day.dateLabel}</div>
                ) : null}
              </div>
          ))}
        </div>

        {rowLayouts.map((rowLayoutItem) => {
          const currentLayout = rowLayoutItem.layout

          return (
            <div
              key={rowLayoutItem.id}
              className="grid border-b last:border-b-0"
              style={{ gridTemplateColumns }}
            >
              {hasRows ? (
                <div
                  className="flex items-start border-r bg-muted/5 px-2 py-3"
                  style={{ height: `${currentLayout.timeRange.heightPx}px` }}
                >
                  <span className="text-sm font-semibold text-foreground">{rowLayoutItem.row?.label}</span>
                </div>
              ) : null}

              <div
                data-slot="schedule-time-column"
                className="relative border-r bg-muted/10"
                style={{ height: `${currentLayout.timeRange.heightPx}px` }}
              >
                {currentLayout.timeSlots.map((slot) => (
                  <div
                    key={`${rowLayoutItem.id}-${slot.key}`}
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
                          slot.minutes === currentLayout.timeRange.startMinutes
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

              {currentLayout.days.map((day) => {
                const positionedEvents = currentLayout.eventsByDay[day.key] ?? []

                return (
                  <div
                    key={`${rowLayoutItem.id}-${day.key}`}
                    data-slot="schedule-day-column"
                    aria-label={hasRows ? `${day.fullLabel}, ${String(rowLayoutItem.row?.label ?? "")}` : day.fullLabel}
                    className="relative border-r last:border-r-0"
                    style={{ height: `${currentLayout.timeRange.heightPx}px` }}
                  >
                    {renderDayColumnOverlay
                      ? renderDayColumnOverlay({
                          dayKey: day.key,
                          rowId: rowLayoutItem.row?.id ?? null,
                          startMinutes: currentLayout.timeRange.startMinutes,
                          endMinutes: currentLayout.timeRange.endMinutes,
                          heightPx: currentLayout.timeRange.heightPx,
                        })
                      : null}
                    {currentLayout.timeSlots.map((slot) => (
                      <div
                        key={`${rowLayoutItem.id}-${day.key}-${slot.key}`}
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
          )
        })}
      </div>
    </div>
  )
}
