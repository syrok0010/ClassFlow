"use client";

import { BookOpen } from "lucide-react";

import { DEFAULT_SCHEDULE_VIEW, ReadonlyScheduleBrowser } from "@/features/schedule";

import type { StudentSchedulePageData } from "../_lib/student-schedule-types";
import { StudentScheduleEventCard } from "./student-schedule-event-card";

type StudentScheduleViewProps = StudentSchedulePageData;

export function StudentScheduleView({
  anchorDate,
  dateParam,
  events,
  viewMode,
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
      renderEvent={(event) => <StudentScheduleEventCard event={event} />}
    />
  );
}
