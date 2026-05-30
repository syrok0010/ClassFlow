"use client";

import { BookOpen } from "lucide-react";

import { ReadonlyScheduleBrowser } from "@/features/schedule/components/readonly-schedule-browser";
import { DEFAULT_SCHEDULE_VIEW } from "@/features/schedule/lib/query-params";

import { StudentScheduleEventCard } from "./student-schedule-event-card";
import type { StudentScheduleEvent, StudentSchedulePageData } from "./student-schedule-types";

interface StudentScheduleViewProps extends StudentSchedulePageData {
  renderEventCard?: (event: StudentScheduleEvent) => React.ReactNode;
}

export function StudentScheduleView({
  anchorDate,
  dateParam,
  events,
  viewMode,
  renderEventCard,
}: StudentScheduleViewProps) {
  return (
    <ReadonlyScheduleBrowser
      anchorDate={anchorDate}
      dateParam={dateParam}
      viewMode={viewMode}
      events={events}
      defaultView={DEFAULT_SCHEDULE_VIEW}
      emptyState={{
        icon: <BookOpen />,
        title: "Нет занятий",
        description: "На выбранный день или неделю расписание пусто.",
      }}
      renderEvent={(event) =>
        renderEventCard ? renderEventCard(event) : <StudentScheduleEventCard event={event} />
      }
    />
  );
}
