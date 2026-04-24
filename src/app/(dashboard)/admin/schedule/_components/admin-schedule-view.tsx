"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { BookOpen, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReadonlySchedule } from "@/features/schedule";
import { cn } from "@/lib/utils";

import {
  createOrUpdateAdminScheduleTemplateAction,
  deleteAdminScheduleTemplateAction,
} from "../_actions/schedule-actions";
import type { AdminScheduleEvent, AdminSchedulePageData } from "../_lib/admin-schedule-types";
import { detectAdminScheduleConflicts, type EventConflict } from "./admin-schedule-conflicts";
import { AdminScheduleEventCard } from "./admin-schedule-event-card";
import { ScheduleDeleteDialog } from "./schedule-delete-dialog";
import {
  type ScheduleEditorDraft,
  ScheduleEventEditorDialog,
} from "./schedule-event-editor-dialog";
import { ScheduleMultiSelect } from "./schedule-multi-select";

type AdminScheduleViewProps = AdminSchedulePageData;

const PARKING_DROP_ID = "parking-drop-zone";

export function AdminScheduleView({
  events,
  classRows,
  subjectOptions,
  groupOptions,
  roomOptions,
  teacherOptions,
  lessonDurationByGroupSubject,
}: AdminScheduleViewProps) {
  const router = useRouter();
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const [editingDraft, setEditingDraft] = useState<ScheduleEditorDraft | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminScheduleEvent | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const classOptions = useMemo(
    () => classRows.map((row) => ({ id: row.id, label: row.name })),
    [classRows],
  );

  const teacherFilterOptions = useMemo(() => {
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

  const roomFilterOptions = useMemo(() => {
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

  const subjectFilterOptions = useMemo(() => {
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

  const scheduleRows = useMemo(
    () =>
      classRows
        .filter((row) => !visibleClassIds || visibleClassIds.has(row.id))
        .map((row) => ({ id: row.id, label: row.name })),
    [classRows, visibleClassIds],
  );

  const detachedEvents = useMemo(
    () => events.filter((event) => event.detached),
    [events],
  );

  const gridEvents = useMemo(
    () => events.filter((event) => !event.detached && (!visibleClassIds || visibleClassIds.has(event.classId))),
    [events, visibleClassIds],
  );

  const shouldDimByMetaFilters =
    selectedTeacherIds.length > 0 || selectedRoomIds.length > 0 || selectedSubjectIds.length > 0;

  const selectedTeacherSet = useMemo(() => new Set(selectedTeacherIds), [selectedTeacherIds]);
  const selectedRoomSet = useMemo(() => new Set(selectedRoomIds), [selectedRoomIds]);
  const selectedSubjectSet = useMemo(() => new Set(selectedSubjectIds), [selectedSubjectIds]);

  const isEventHighlighted = (event: AdminScheduleEvent) => {
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

  const conflictByEvent = useMemo(() => detectAdminScheduleConflicts(gridEvents), [gridEvents]);

  const handleEdit = (event: AdminScheduleEvent) => {
    setEditingDraft({
      templateId: event.templateId,
      detached: event.detached,
      dayOfWeek: event.detached ? null : event.dayOfWeek,
      startMinutes: event.detached ? null : event.startMinutes,
      endMinutes: event.detached ? null : event.endMinutes,
      subjectId: event.subjectId,
      groupId: event.groupId,
      roomId: event.roomId,
      teacherId: event.teacherId,
    });
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingDraft({
      detached: true,
      dayOfWeek: null,
      startMinutes: null,
      endMinutes: null,
      subjectId: subjectOptions[0]?.id ?? "",
      groupId: groupOptions[0]?.id ?? "",
      roomId: null,
      teacherId: null,
    });
    setIsEditorOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const activeEvent = events.find((item) => item.id === activeId);
    if (!activeEvent) {
      return;
    }

    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) {
      return;
    }

    if (overId === PARKING_DROP_ID) {
      await createOrUpdateAdminScheduleTemplateAction({
        templateId: activeEvent.templateId,
        detached: true,
        dayOfWeek: null,
        startMinutes: null,
        endMinutes: null,
        groupId: activeEvent.groupId,
        subjectId: activeEvent.subjectId,
        roomId: activeEvent.roomId,
        teacherId: activeEvent.teacherId,
      });
      router.refresh();
      return;
    }

    if (!overId.startsWith("slot:")) {
      return;
    }

    const [, dayKey, rowId, startMinutesRaw] = overId.split(":");
    const dayMap: Record<string, number> = {
      "mon": 1,
      "tue": 2,
      "wed": 3,
      "thu": 4,
      "fri": 5,
    };
    const dayOfWeek = dayMap[dayKey];
    const startMinutes = Number(startMinutesRaw);
    const duration = Math.max(1, activeEvent.endMinutes - activeEvent.startMinutes);

    if (!dayOfWeek || Number.isNaN(startMinutes) || !rowId) {
      return;
    }

    await createOrUpdateAdminScheduleTemplateAction({
      templateId: activeEvent.templateId,
      detached: false,
      dayOfWeek,
      startMinutes,
      endMinutes: startMinutes + duration,
      groupId: rowId,
      subjectId: activeEvent.subjectId,
      roomId: activeEvent.roomId,
      teacherId: activeEvent.teacherId,
    });
    router.refresh();
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
          options={teacherFilterOptions}
          selectedIds={selectedTeacherIds}
          onChange={setSelectedTeacherIds}
        />
        <ScheduleMultiSelect
          title="Кабинет"
          options={roomFilterOptions}
          selectedIds={selectedRoomIds}
          onChange={setSelectedRoomIds}
        />
        <ScheduleMultiSelect
          title="Предмет"
          options={subjectFilterOptions}
          selectedIds={selectedSubjectIds}
          onChange={setSelectedSubjectIds}
        />
      </div>

      <DndContext sensors={sensors} onDragEnd={(event) => void handleDragEnd(event)}>
        <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-3">
          <TemporaryScheduleArea
            events={detachedEvents}
            shouldDimByMetaFilters={shouldDimByMetaFilters}
            isEventHighlighted={isEventHighlighted}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onDelete={setDeleteTarget}
          />

          <div className="relative">
            <ReadonlySchedule
              viewMode="week"
              events={gridEvents}
              rows={scheduleRows}
              getEventRowId={(event) => event.classId}
              rowColumnTitle="Класс"
              renderDayColumnOverlay={({ dayKey, rowId, startMinutes, endMinutes, heightPx }) => (
                <GridDropOverlay
                  dayKey={dayKey}
                  rowId={rowId}
                  startMinutes={startMinutes}
                  endMinutes={endMinutes}
                  heightPx={heightPx}
                />
              )}
              emptyState={{
                icon: <BookOpen />,
                title: "Нет шаблонов",
                description: "На выбранный период шаблон расписания не заполнен.",
              }}
              renderEvent={(event) => (
                <DraggableScheduleEventCard
                  event={event}
                  isDimmed={shouldDimByMetaFilters && !isEventHighlighted(event)}
                  conflicts={conflictByEvent.get(event.id) ?? []}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                />
              )}
            />
          </div>
        </div>
      </DndContext>

      <ScheduleEventEditorDialog
        open={isEditorOpen}
        title={editingDraft?.templateId ? "Редактирование карточки" : "Создание карточки"}
        description="Измените поля карточки и сохраните"
        draft={editingDraft}
        subjectOptions={subjectOptions}
        groupOptions={groupOptions}
        roomOptions={roomOptions}
        teacherOptions={teacherOptions}
        lessonDurationByGroupSubject={lessonDurationByGroupSubject}
        onOpenChange={setIsEditorOpen}
        onSave={async (draft) => {
          await createOrUpdateAdminScheduleTemplateAction(draft);
          router.refresh();
        }}
      />

      <ScheduleDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }
          await deleteAdminScheduleTemplateAction(deleteTarget.templateId);
          router.refresh();
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function DraggableScheduleEventCard({
  event,
  isDimmed,
  conflicts,
  onEdit,
  onDelete,
}: {
  event: AdminScheduleEvent;
  isDimmed: boolean;
  conflicts: EventConflict[];
  onEdit: (event: AdminScheduleEvent) => void;
  onDelete: (event: AdminScheduleEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(isDragging && "opacity-70")}
      {...listeners}
      {...attributes}
    >
      <AdminScheduleEventCard
        event={event}
        isDimmed={isDimmed}
        conflicts={conflicts}
        showActions
        forceFullDetails={event.detached}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

function TemporaryScheduleArea({
  events,
  shouldDimByMetaFilters,
  isEventHighlighted,
  onCreate,
  onEdit,
  onDelete,
}: {
  events: AdminScheduleEvent[];
  shouldDimByMetaFilters: boolean;
  isEventHighlighted: (event: AdminScheduleEvent) => boolean;
  onCreate: () => void;
  onEdit: (event: AdminScheduleEvent) => void;
  onDelete: (event: AdminScheduleEvent) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: PARKING_DROP_ID });

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Временная область</span>
        <Button size="sm" variant="outline" onClick={onCreate}>
          <Plus className="size-3.5" />
          Добавить
        </Button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[70vh] space-y-2 p-2",
          isOver && "bg-primary/10",
        )}
      >
        {events.map((event) => (
          <DraggableScheduleEventCard
            key={event.id}
            event={event}
            isDimmed={shouldDimByMetaFilters && !isEventHighlighted(event)}
            conflicts={[]}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function GridDropOverlay({
  dayKey,
  rowId,
  startMinutes,
  endMinutes,
  heightPx,
}: {
  dayKey: string;
  rowId: string | null;
  startMinutes: number;
  endMinutes: number;
  heightPx: number;
}) {
  if (!rowId) {
    return null;
  }

  const [year, month, day] = dayKey.split("-").map(Number);
  const dayMap = ["mon", "tue", "wed", "thu", "fri"];
  const dayIndex = new Date(year, (month ?? 1) - 1, day ?? 1).getDay();
  const dayCode = dayMap[(dayIndex + 6) % 7] ?? "mon";

  const slots: { id: string; top: number; height: number }[] = [];
  const step = 15;
  const minutesSpan = endMinutes - startMinutes;
  const pxPerMinute = heightPx / Math.max(minutesSpan, 1);

  for (let minutes = startMinutes; minutes < endMinutes; minutes += step) {
    slots.push({
      id: `slot:${dayCode}:${rowId}:${minutes}`,
      top: (minutes - startMinutes) * pxPerMinute,
      height: Math.max(step * pxPerMinute, 20),
    });
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      {slots.map((slot) => (
        <DropSlot key={slot.id} id={slot.id} top={slot.top} height={slot.height} />
      ))}
    </div>
  );
}

function DropSlot({ id, top, height }: { id: string; top: number; height: number }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "pointer-events-auto absolute inset-x-0 rounded-sm",
        isOver && "bg-primary/20 ring-1 ring-primary/50",
      )}
      style={{ top, height }}
    />
  );
}
