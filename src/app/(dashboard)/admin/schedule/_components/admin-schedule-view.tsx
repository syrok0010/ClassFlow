"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import { BookOpen } from "lucide-react";

import { ReadonlySchedule } from "@/features/schedule";

import {
  createOrUpdateAdminScheduleTemplateAction,
  deleteAdminScheduleTemplateAction,
} from "../_actions/schedule-actions";
import type { AdminScheduleEvent, AdminSchedulePageData } from "../_lib/admin-schedule-types";
import {
  buildDraftFromEvent,
  buildEmptyDraft,
} from "../_lib/admin-schedule-template-commands";
import {
  analyzeScheduleTemplateConflicts,
  type ScheduleConflict,
} from "../_lib/schedule-conflicts";
import {
  DraggableScheduleEventCard,
  ScheduleGridDropCell,
  TemporaryScheduleArea,
} from "./schedule-dnd-components";
import { ScheduleDeleteDialog } from "./schedule-delete-dialog";
import {
  type ScheduleEditorDraft,
  ScheduleEventEditorDialog,
} from "./schedule-event-editor-dialog";
import { ScheduleMultiSelect } from "./schedule-multi-select";
import { useAdminScheduleDnd } from "./use-admin-schedule-dnd";

type AdminScheduleViewProps = AdminSchedulePageData;

const EMPTY_CONFLICTS: ScheduleConflict[] = [];
const SCHEDULE_EMPTY_STATE = {
  icon: <BookOpen />,
  title: "Нет шаблонов",
  description: "На выбранный период шаблон расписания не заполнен.",
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
  const {
    optimisticEvents,
    isDragActive,
    isEventDisabled,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
  } = useAdminScheduleDnd(events);

  const classOptions = useMemo(
    () => classRows.map((row) => ({ id: row.id, label: row.name })),
    [classRows],
  );

  const teacherFilterOptions = useMemo(
    () => buildUniqueSortedOptions(
      events.map((event) => ({ id: event.teacherId, label: event.teacherName })),
    ),
    [events],
  );

  const roomFilterOptions = useMemo(
    () => buildUniqueSortedOptions(
      events.map((event) => ({ id: event.roomId, label: event.roomName })),
    ),
    [events],
  );

  const subjectFilterOptions = useMemo(
    () => buildUniqueSortedOptions(
      events.map((event) => ({ id: event.subjectId, label: event.subjectName })),
    ),
    [events],
  );

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
    () => optimisticEvents.filter((event) => event.detached),
    [optimisticEvents],
  );

  const gridEvents = useMemo(
    () => optimisticEvents.filter((event) => !event.detached && (!visibleClassIds || visibleClassIds.has(event.classId))),
    [optimisticEvents, visibleClassIds],
  );

  const shouldDimByMetaFilters =
    selectedTeacherIds.length > 0 || selectedRoomIds.length > 0 || selectedSubjectIds.length > 0;

  const selectedTeacherSet = useMemo(() => new Set(selectedTeacherIds), [selectedTeacherIds]);
  const selectedRoomSet = useMemo(() => new Set(selectedRoomIds), [selectedRoomIds]);
  const selectedSubjectSet = useMemo(() => new Set(selectedSubjectIds), [selectedSubjectIds]);

  const isEventHighlighted = useCallback((event: AdminScheduleEvent) => {
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
  }, [selectedRoomSet, selectedSubjectSet, selectedTeacherSet]);

  const conflictAnalysis = useMemo(() => analyzeScheduleTemplateConflicts(optimisticEvents), [optimisticEvents]);
  const conflictByEvent = conflictAnalysis.conflictsByProjectionId;

  const handleEdit = useCallback((event: AdminScheduleEvent) => {
    setEditingDraft(buildDraftFromEvent(event));
    setIsEditorOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingDraft(buildEmptyDraft());
    setIsEditorOpen(true);
  }, []);

  const handleDelete = useCallback((event: AdminScheduleEvent) => {
    setDeleteTarget(event);
  }, []);

  const getEventConflicts = useCallback(
    (eventId: string) => conflictByEvent.get(eventId) ?? EMPTY_CONFLICTS,
    [conflictByEvent],
  );
  const getEventRowId = useCallback((event: AdminScheduleEvent) => event.classId, []);
  const renderDayColumnOverlay = useCallback(
    ({
      dayIndex,
      rowId,
      startMinutes,
      endMinutes,
    }: {
      dayIndex: number;
      rowId: string | null;
      startMinutes: number;
      endMinutes: number;
    }) =>
      rowId ? (
        <div className="pointer-events-none absolute inset-0">
          <ScheduleGridDropCell
            dayIndex={dayIndex}
            rowId={rowId}
            startMinutes={startMinutes}
            endMinutes={endMinutes}
          />
        </div>
      ) : null,
    [],
  );
  const renderScheduleEvent = useCallback(
    (event: AdminScheduleEvent) => (
      <DraggableScheduleEventCard
        event={event}
        isDimmed={shouldDimByMetaFilters && !isEventHighlighted(event)}
        conflicts={getEventConflicts(event.id)}
        disabled={isEventDisabled(event)}
        disableTooltip={isDragActive}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    ),
    [
      getEventConflicts,
      handleDelete,
      handleEdit,
      isDragActive,
      isEventDisabled,
      isEventHighlighted,
      shouldDimByMetaFilters,
    ],
  );

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
        onDragStart={handleDragStart}
        onDragEnd={(event) => void handleDragEnd(event)}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-3">
          <TemporaryScheduleArea
            events={detachedEvents}
            conflictByEvent={conflictByEvent}
            shouldDimByMetaFilters={shouldDimByMetaFilters}
            isEventHighlighted={isEventHighlighted}
            isEventDisabled={isEventDisabled}
            disableTooltips={isDragActive}
            onCreate={handleCreate}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <div className="relative">
            <ReadonlySchedule
              viewMode="week"
              events={gridEvents}
              rows={scheduleRows}
              getEventRowId={getEventRowId}
              rowColumnTitle="Класс"
              renderDayColumnOverlay={renderDayColumnOverlay}
              emptyState={SCHEDULE_EMPTY_STATE}
              renderEvent={renderScheduleEvent}
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

function buildUniqueSortedOptions(
  options: Array<{ id: string | null; label: string }>,
) {
  const seen = new Set<string>();

  return options
    .filter((option): option is { id: string; label: string } => {
      if (!option.id || seen.has(option.id)) {
        return false;
      }

      seen.add(option.id);
      return true;
    })
    .map((option) => ({ id: option.id, label: option.label }))
    .sort((left, right) => left.label.localeCompare(right.label, "ru"));
}
