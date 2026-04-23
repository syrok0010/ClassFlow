"use client";

import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";

import { ReadonlySchedule } from "@/features/schedule";

import type { AdminSchedulePageData } from "../_lib/admin-schedule-types";
import { AdminScheduleEventCard } from "./admin-schedule-event-card";
import { ScheduleMultiSelect } from "./schedule-multi-select";

type AdminScheduleViewProps = AdminSchedulePageData;

export function AdminScheduleView({
  events,
  classRows,
}: AdminScheduleViewProps) {
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const classOptions = useMemo(
    () => classRows.map((row) => ({ id: row.id, label: row.name })),
    [classRows],
  );

  const teacherOptions = useMemo(() => {
    const seen = new Set<string>();
    return events
      .filter((event) => event.teacherId)
      .map((event) => ({ id: event.teacherId as string, label: event.teacherName }))
      .filter((option) => {
        if (seen.has(option.id)) return false;
        seen.add(option.id);
        return true;
      })
      .sort((left, right) => left.label.localeCompare(right.label, "ru"));
  }, [events]);

  const roomOptions = useMemo(() => {
    const seen = new Set<string>();
    return events
      .filter((event) => event.roomId)
      .map((event) => ({ id: event.roomId as string, label: event.roomName }))
      .filter((option) => {
        if (seen.has(option.id)) return false;
        seen.add(option.id);
        return true;
      })
      .sort((left, right) => left.label.localeCompare(right.label, "ru"));
  }, [events]);

  const subjectOptions = useMemo(() => {
    const seen = new Set<string>();
    return events
      .map((event) => ({ id: event.subjectId, label: event.subjectName }))
      .filter((option) => {
        if (seen.has(option.id)) return false;
        seen.add(option.id);
        return true;
      })
      .sort((left, right) => left.label.localeCompare(right.label, "ru"));
  }, [events]);

  const visibleClassIds = useMemo(
    () => (selectedClassIds.length > 0 ? new Set(selectedClassIds) : null),
    [selectedClassIds],
  );

  const filteredRows = useMemo(
    () =>
      classRows
        .filter((row) => !visibleClassIds || visibleClassIds.has(row.id))
        .map((row) => ({ id: row.id, label: row.name })),
    [classRows, visibleClassIds],
  );

  const filteredEvents = useMemo(
    () => events.filter((event) => !visibleClassIds || visibleClassIds.has(event.classId)),
    [events, visibleClassIds],
  );

  const shouldDimByMetaFilters =
    selectedTeacherIds.length > 0 || selectedRoomIds.length > 0 || selectedSubjectIds.length > 0;

  const selectedTeacherSet = useMemo(() => new Set(selectedTeacherIds), [selectedTeacherIds]);
  const selectedRoomSet = useMemo(() => new Set(selectedRoomIds), [selectedRoomIds]);
  const selectedSubjectSet = useMemo(() => new Set(selectedSubjectIds), [selectedSubjectIds]);

  const isEventHighlighted = (event: AdminSchedulePageData["events"][number]) => {
    if (selectedTeacherSet.size > 0 && (!event.teacherId || !selectedTeacherSet.has(event.teacherId))) {
      return false;
    }
    if (selectedRoomSet.size > 0 && (!event.roomId || !selectedRoomSet.has(event.roomId))) {
      return false;
    }
    if (selectedSubjectSet.size > 0 && !selectedSubjectSet.has(event.subjectId)) {
      return false;
    }
    return true;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <ScheduleMultiSelect
          title="Класс"
          options={classOptions}
          selectedIds={selectedClassIds}
          onChange={setSelectedClassIds}
        />
        <ScheduleMultiSelect
          title="Учитель"
          options={teacherOptions}
          selectedIds={selectedTeacherIds}
          onChange={setSelectedTeacherIds}
        />
        <ScheduleMultiSelect
          title="Кабинет"
          options={roomOptions}
          selectedIds={selectedRoomIds}
          onChange={setSelectedRoomIds}
        />
        <ScheduleMultiSelect
          title="Предмет"
          options={subjectOptions}
          selectedIds={selectedSubjectIds}
          onChange={setSelectedSubjectIds}
        />
      </div>

      <div className="relative">
        <ReadonlySchedule
          viewMode="week"
          events={filteredEvents}
          rows={filteredRows}
          getEventRowId={(event) => event.classId}
          rowColumnTitle="Класс"
          emptyState={{
            icon: <BookOpen />,
            title: "Нет шаблонов",
            description: "На выбранный период шаблон расписания не заполнен.",
          }}
          renderEvent={(event) => (
            <AdminScheduleEventCard
              event={event}
              isDimmed={shouldDimByMetaFilters && !isEventHighlighted(event)}
            />
          )}
        />
      </div>
    </div>
  );
}
