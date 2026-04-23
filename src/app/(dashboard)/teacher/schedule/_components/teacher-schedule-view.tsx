"use client";

import { CalendarDays } from "lucide-react";

import { DEFAULT_SCHEDULE_VIEW, ReadonlyScheduleBrowser } from "@/features/schedule";

import type { TeacherSchedulePageData } from "../_lib/teacher-schedule-types";
import { TeacherScheduleEventCard } from "./teacher-schedule-event-card";

type TeacherScheduleViewProps = TeacherSchedulePageData;

export function TeacherScheduleView({
  anchorDate,
  dateParam,
  events,
  viewMode,
}: TeacherScheduleViewProps) {
  return (
    <ReadonlyScheduleBrowser
      anchorDate={anchorDate}
      dateParam={dateParam}
      viewMode={viewMode}
      events={events}
      defaultView={DEFAULT_SCHEDULE_VIEW}
      emptyState={{
        icon: <CalendarDays />,
        title: "Нет занятий",
        description: "На выбранный день или неделю у вас нет фактических записей расписания.",
      }}
      renderEvent={(event) => <TeacherScheduleEventCard event={event} />}
    />
  );
}
