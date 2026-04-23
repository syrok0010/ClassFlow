"use client";

import { useMemo } from "react";
import { BookOpen } from "lucide-react";

import { ReadonlySchedule } from "@/features/schedule";

import type { AdminSchedulePageData } from "../_lib/admin-schedule-types";
import { AdminScheduleEventCard } from "./admin-schedule-event-card";

type AdminScheduleViewProps = AdminSchedulePageData;

export function AdminScheduleView({
  events,
  classRows,
}: AdminScheduleViewProps) {
  const classRowsConfig = useMemo(
    () => classRows.map((row) => ({ id: row.id, label: row.name })),
    [classRows],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <ReadonlySchedule
          viewMode="week"
          events={events}
          rows={classRowsConfig}
          getEventRowId={(event) => event.classId}
          rowColumnTitle="Класс"
          emptyState={{
            icon: <BookOpen />,
            title: "Нет шаблонов",
            description: "На выбранный период шаблон расписания не заполнен.",
          }}
          renderEvent={(event) => <AdminScheduleEventCard event={event} />}
        />
      </div>
    </div>
  );
}
