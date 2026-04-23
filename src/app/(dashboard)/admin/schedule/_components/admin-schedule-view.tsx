"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ReadonlySchedule } from "@/features/schedule";
import { cn } from "@/lib/utils";

import type { AdminSchedulePageData } from "../_lib/admin-schedule-types";
import { AdminScheduleEventCard } from "./admin-schedule-event-card";

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
        if (seen.has(option.id)) {
          return false;
        }
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
        if (seen.has(option.id)) {
          return false;
        }
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
        if (seen.has(option.id)) {
          return false;
        }
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
    return !(selectedSubjectSet.size > 0 && !selectedSubjectSet.has(event.subjectId));

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

type FilterOption = {
  id: string;
  label: string;
};

interface ScheduleMultiSelectProps {
  title: string;
  options: FilterOption[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
}

function ScheduleMultiSelect({
  title,
  options,
  selectedIds,
  onChange,
}: ScheduleMultiSelectProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;
  const sortedOptions = useMemo(() => {
    const selected: FilterOption[] = [];
    const unselected: FilterOption[] = [];

    for (const option of options) {
      if (selectedSet.has(option.id)) {
        selected.push(option);
      } else {
        unselected.push(option);
      }
    }

    return [...selected, ...unselected];
  }, [options, selectedSet]);

  const toggleOption = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedSet, id]);
      return;
    }

    onChange(selectedIds.filter((item) => item !== id));
  };

  const clearSelection = () => onChange([]);

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="h-9 justify-between" />}>
        <span className="truncate text-sm">{title}</span>
        <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
          {selectedCount > 0 ? `${selectedCount}` : "Все"}
          <ChevronDown className="size-3.5" />
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="border-b px-3 py-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto px-2 py-2">
          {options.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Нет доступных вариантов</p>
          ) : (
            <div className="space-y-1">
              {sortedOptions.map((option) => {
                const checked = selectedSet.has(option.id);
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted",
                      checked && "bg-muted/70",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleOption(option.id, Boolean(value))}
                    />
                    <span className="truncate text-sm text-foreground">{option.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end border-t px-2 py-2">
          <Button variant="ghost" size="sm" onClick={clearSelection} disabled={selectedCount === 0}>
            Сбросить
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
