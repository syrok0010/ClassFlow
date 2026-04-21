"use client";

import { useMemo, useTransition } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useQueryState } from "nuqs";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ReadonlySchedule } from "@/features/schedule";

import {
  DEFAULT_STUDENT_SCHEDULE_VIEW,
  parseStudentScheduleDate,
  parseStudentScheduleView,
} from "../_lib/student-schedule-params";
import type { StudentSchedulePageData } from "../_lib/student-schedule-types";
import { StudentScheduleEventCard } from "./student-schedule-event-card";

type StudentScheduleViewProps = StudentSchedulePageData;

export function StudentScheduleView({
  anchorDate,
  dateParam,
  emptyState,
  events,
  viewMode,
}: StudentScheduleViewProps) {
  const todayDateParam = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const [isPending, startTransition] = useTransition();
  const [currentView, setCurrentView] = useQueryState("view", {
    defaultValue: DEFAULT_STUDENT_SCHEDULE_VIEW,
    shallow: false,
    startTransition,
  });
  const [currentDate, setCurrentDate] = useQueryState("date", {
    defaultValue: todayDateParam,
    shallow: false,
    startTransition,
  });

  const optimisticViewMode = parseStudentScheduleView(currentView);
  const optimisticAnchorDate = useMemo(() => {
    return parseStudentScheduleDate(currentDate);
  }, [currentDate]);
  const confirmedEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      })),
    [events]
  );
  const isScheduleRefreshing =
    isPending || currentView !== viewMode || currentDate !== dateParam;
  const weekStart = startOfWeek(optimisticAnchorDate, { weekStartsOn: 1 });
  const periodLabel =
    optimisticViewMode === "day"
      ? format(optimisticAnchorDate, "d MMMM yyyy")
      : `${format(weekStart, "d MMM")} - ${format(addDays(weekStart, 6), "d MMM yyyy")}`;

  const shiftPeriod = (direction: -1 | 1) => {
    const step = optimisticViewMode === "day" ? 1 : 7;
    const nextDate = addDays(optimisticAnchorDate, direction * step);

    void setCurrentDate(format(nextDate, "yyyy-MM-dd"));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-sm font-medium text-foreground">{periodLabel}</div>
          <div className="text-xs text-muted-foreground">
            Фактическое расписание по всем учебным группам ученика.
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <SegmentedControl
            value={optimisticViewMode}
            onChange={(nextView) => {
              void setCurrentView(nextView === DEFAULT_STUDENT_SCHEDULE_VIEW ? null : nextView);
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
            <Button
              variant="outline"
              size="sm"
              disabled={isScheduleRefreshing}
              onClick={() => {
                void setCurrentDate(null);
              }}
            >
              Сегодня
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isScheduleRefreshing}
              onClick={() => shiftPeriod(1)}
              aria-label="Вперёд"
            >
              Вперёд
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative" aria-busy={isScheduleRefreshing}>
        {isScheduleRefreshing ? <StudentSchedulePendingOverlay /> : null}
        <ReadonlySchedule
          anchorDate={anchorDate}
          viewMode={viewMode}
          events={confirmedEvents}
          emptyState={emptyState}
          renderEvent={(event) => <StudentScheduleEventCard event={event} />}
        />
      </div>
    </div>
  );
}

function StudentSchedulePendingOverlay() {
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
