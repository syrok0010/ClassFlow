"use client";

import { useMemo, useTransition } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useQueryState } from "nuqs";

import { Button } from "@/components/ui/button";
import type { EmptyStateConfig } from "@/components/ui/filterable-empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";

import { DEFAULT_SCHEDULE_VIEW, parseScheduleDate, parseScheduleView } from "../lib/query-params";
import type { BaseScheduleEvent, ScheduleViewMode } from "../lib/types";
import { ReadonlySchedule } from "./readonly-schedule";

interface ReadonlyScheduleBrowserProps<TEvent extends BaseScheduleEvent> {
  anchorDate: Date;
  dateParam: string;
  viewMode: ScheduleViewMode;
  events: readonly TEvent[];
  emptyState: EmptyStateConfig;
  renderEvent: (event: TEvent) => React.ReactNode;
  defaultView?: ScheduleViewMode;
  className?: string;
}

export function ReadonlyScheduleBrowser<TEvent extends BaseScheduleEvent>({
  anchorDate,
  dateParam,
  viewMode,
  events,
  emptyState,
  renderEvent,
  defaultView = DEFAULT_SCHEDULE_VIEW,
  className,
}: ReadonlyScheduleBrowserProps<TEvent>) {
  const todayDateParam = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [isPending, startTransition] = useTransition();
  const [currentView, setCurrentView] = useQueryState("view", {
    defaultValue: defaultView,
    shallow: false,
    startTransition,
  });
  const [currentDate, setCurrentDate] = useQueryState("date", {
    defaultValue: todayDateParam,
    shallow: false,
    startTransition,
  });

  const optimisticViewMode = parseScheduleView(currentView);
  const optimisticAnchorDate = useMemo(() => parseScheduleDate(currentDate), [currentDate]);
  const confirmedEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      })) as TEvent[],
    [events]
  );
  const isScheduleRefreshing =
    isPending || currentView !== viewMode || currentDate !== dateParam;
  const weekStart = startOfWeek(optimisticAnchorDate, { weekStartsOn: 1 });
  const periodLabel =
    optimisticViewMode === "day"
      ? format(optimisticAnchorDate, "d MMMM yyyy", { locale: ru })
      : `${format(weekStart, "d MMM", { locale: ru })} - ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: ru })}`;

  const shiftPeriod = (direction: -1 | 1) => {
    const step = optimisticViewMode === "day" ? 1 : 7;
    const nextDate = addDays(optimisticAnchorDate, direction * step);

    void setCurrentDate(format(nextDate, "yyyy-MM-dd"));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:items-center">
        <SegmentedControl
          value={optimisticViewMode}
          onChange={(nextView) => {
            void setCurrentView(nextView === defaultView ? null : nextView);
          }}
          options={[
            { value: "week", label: "Неделя", disabled: isScheduleRefreshing },
            { value: "day", label: "День", disabled: isScheduleRefreshing },
          ]}
          size="sm"
        />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isScheduleRefreshing}
            onClick={() => shiftPeriod(-1)}
            aria-label="Назад"
          >
            <ChevronLeft />
            Назад
          </Button>
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">{periodLabel}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isScheduleRefreshing}
            onClick={() => shiftPeriod(1)}
            aria-label="Вперед"
          >
            Вперед
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="relative" aria-busy={isScheduleRefreshing}>
        {isScheduleRefreshing ? <ReadonlySchedulePendingOverlay /> : null}
        <ReadonlySchedule
          anchorDate={anchorDate}
          viewMode={viewMode}
          events={confirmedEvents}
          emptyState={emptyState}
          renderEvent={renderEvent}
          className={className}
        />
      </div>
    </div>
  );
}

function ReadonlySchedulePendingOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]">
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
      >
        <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" />
        <span>Загружаем расписание...</span>
      </div>
    </div>
  );
}
