"use client";

import { useMemo } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useQueryState } from "nuqs";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ReadonlySchedule } from "@/features/schedule";

import {
  DEFAULT_STUDENT_SCHEDULE_VIEW,
  formatStudentScheduleDateParam,
  parseStudentScheduleDate,
  parseStudentScheduleView,
} from "../_lib/student-schedule-params";
import type { StudentSchedulePageData } from "../_lib/student-schedule-types";
import { StudentScheduleEventCard } from "./student-schedule-event-card";

type StudentScheduleViewProps = StudentSchedulePageData;

export function StudentScheduleView({
  dateParam,
  emptyState,
  events,
}: StudentScheduleViewProps) {
  const todayDateParam = useMemo(() => formatStudentScheduleDateParam(new Date()), []);
  const [currentView, setCurrentView] = useQueryState("view", {
    defaultValue: DEFAULT_STUDENT_SCHEDULE_VIEW,
    shallow: false,
  });
  const [currentDate, setCurrentDate] = useQueryState("date", {
    defaultValue: todayDateParam,
    shallow: false,
  });

  const resolvedViewMode = parseStudentScheduleView(currentView ?? DEFAULT_STUDENT_SCHEDULE_VIEW);
  const resolvedAnchorDate = useMemo(() => {
    return parseStudentScheduleDate(currentDate ?? dateParam);
  }, [currentDate, dateParam]);
  const normalizedEvents = useMemo(
    () =>
      events.map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      })),
    [events]
  );
  const weekStart = startOfWeek(resolvedAnchorDate, { weekStartsOn: 1 });
  const periodLabel =
    resolvedViewMode === "day"
      ? format(resolvedAnchorDate, "d MMMM yyyy")
      : `${format(weekStart, "d MMM")} - ${format(addDays(weekStart, 6), "d MMM yyyy")}`;

  const shiftPeriod = (direction: -1 | 1) => {
    const step = resolvedViewMode === "day" ? 1 : 7;
    const nextDate = addDays(resolvedAnchorDate, direction * step);

    void setCurrentDate(formatStudentScheduleDateParam(nextDate));
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
            value={resolvedViewMode}
            onChange={(nextView) => {
              void setCurrentView(nextView === DEFAULT_STUDENT_SCHEDULE_VIEW ? null : nextView);
            }}
            options={[
              { value: "week", label: "Неделя" },
              { value: "day", label: "День" },
            ]}
            size="sm"
          />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => shiftPeriod(-1)}
              aria-label="Назад"
            >
              <ChevronLeft />
              Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void setCurrentDate(null);
              }}
            >
              Сегодня
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => shiftPeriod(1)}
              aria-label="Вперёд"
            >
              Вперёд
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <ReadonlySchedule
        anchorDate={resolvedAnchorDate}
        viewMode={resolvedViewMode}
        events={normalizedEvents}
        emptyState={emptyState}
        renderEvent={(event) => <StudentScheduleEventCard event={event} />}
      />
    </div>
  );
}
