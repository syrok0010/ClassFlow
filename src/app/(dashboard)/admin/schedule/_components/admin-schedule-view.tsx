"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { BookOpen } from "lucide-react";

import { ReadonlySchedule } from "@/features/schedule";

import {
  createOrUpdateAdminScheduleTemplateAction,
  deleteAdminScheduleTemplateAction,
  moveAdminScheduleTemplateAction,
} from "../_actions/schedule-actions";
import type { AdminScheduleEvent, AdminSchedulePageData } from "../_lib/admin-schedule-types";
import {
  buildDetachTemplateInput,
  buildDraftFromEvent,
  buildEmptyDraft,
  buildMoveTemplateInput,
} from "../_lib/admin-schedule-template-commands";
import { detectAdminScheduleConflicts } from "./admin-schedule-conflicts";
import {
  DraggableScheduleEventCard,
  GridDropOverlay,
  PARKING_DROP_ID,
  TemporaryScheduleArea,
} from "./schedule-dnd-components";
import { ScheduleDeleteDialog } from "./schedule-delete-dialog";
import {
  type ScheduleEditorDraft,
  ScheduleEventEditorDialog,
} from "./schedule-event-editor-dialog";
import { ScheduleMultiSelect } from "./schedule-multi-select";

type AdminScheduleViewProps = AdminSchedulePageData;

const DAY_CODE_TO_NUMBER: Record<string, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
};

const scheduleCollisionDetection: CollisionDetection = (args) => {
  const collisions = pointerWithin(args);
  if (collisions.length > 0) {
    return collisions;
  }

  return rectIntersection(args);
};

export function AdminScheduleView({
  events,
  classRows,
  subjectOptions,
  directGroupOptions,
  electiveGroupOptions,
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
    setEditingDraft(buildDraftFromEvent(event));
    setIsEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingDraft(buildEmptyDraft());
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
      const result = await moveAdminScheduleTemplateAction(
        buildDetachTemplateInput(activeEvent),
      );
      if (result.error) {
        return;
      }
      router.refresh();
      return;
    }

    if (!overId.startsWith("slot:")) {
      return;
    }

    const [, dayKey, rowId, startMinutesRaw] = overId.split(":");
    const dayOfWeek = DAY_CODE_TO_NUMBER[dayKey];
    const startMinutes = Number(startMinutesRaw);

    if (!dayOfWeek || Number.isNaN(startMinutes) || !rowId) {
      return;
    }

    const moveInput = buildMoveTemplateInput(activeEvent, {
      dayOfWeek,
      rowId,
      startMinutes,
    });
    if (!moveInput) {
      return;
    }

    const moveResult = await moveAdminScheduleTemplateAction(moveInput);
    if (moveResult.error) {
      return;
    }
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

      <DndContext
        sensors={sensors}
        collisionDetection={scheduleCollisionDetection}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
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
        classOptions={classOptions}
        classRows={classRows}
        directGroupOptions={directGroupOptions}
        electiveGroupOptions={electiveGroupOptions}
        roomOptions={roomOptions}
        teacherOptions={teacherOptions}
        lessonDurationByGroupSubject={lessonDurationByGroupSubject}
        onOpenChange={setIsEditorOpen}
        onSave={async (draft) => {
          const result = await createOrUpdateAdminScheduleTemplateAction(draft);
          if (result.error) {
            return result.error;
          }

          router.refresh();
          return null;
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
