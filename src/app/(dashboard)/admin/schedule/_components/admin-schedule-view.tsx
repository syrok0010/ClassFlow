"use client";

import { startTransition, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, set, startOfWeek } from "date-fns";
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
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

import { ReadonlySchedule } from "@/features/schedule";
import { TIME_SLOT_STEP_MINUTES, formatTimeLabel } from "@/features/schedule/lib/date-utils";

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
import {
  analyzeScheduleTemplateConflicts,
  type ScheduleConflict,
} from "../_lib/schedule-conflicts";
import {
  DraggableScheduleEventCard,
  PARKING_DROP_ID,
  ScheduleGridDropCell,
  type ScheduleGridDropData,
  TemporaryScheduleArea,
} from "./schedule-dnd-components";
import { ScheduleDeleteDialog } from "./schedule-delete-dialog";
import {
  type ScheduleEditorDraft,
  ScheduleEventEditorDialog,
} from "./schedule-event-editor-dialog";
import { ScheduleMultiSelect } from "./schedule-multi-select";

type AdminScheduleViewProps = AdminSchedulePageData;
type PendingTemplateMove = {
  dayOfWeek: number | null;
  startMinutes: number | null;
  endMinutes: number | null;
  detached: boolean;
};

const EMPTY_CONFLICTS: ScheduleConflict[] = [];

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
  const [pendingTemplateMoves, setPendingTemplateMoves] = useState<Record<string, PendingTemplateMove>>({});
  const [isDragActive, setIsDragActive] = useState(false);

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

  const visiblePendingTemplateMoves = useMemo(
    () => excludeSyncedPendingTemplateMoves(events, pendingTemplateMoves),
    [events, pendingTemplateMoves],
  );

  const optimisticEvents = useMemo(
    () => applyPendingTemplateMoves(events, visiblePendingTemplateMoves),
    [events, visiblePendingTemplateMoves],
  );

  const detachedEvents = useMemo(
    () => optimisticEvents.filter((event) => event.detached),
    [optimisticEvents],
  );

  const gridEvents = useMemo(
    () => optimisticEvents.filter((event) => !event.detached && (!visibleClassIds || visibleClassIds.has(event.classId))),
    [optimisticEvents, visibleClassIds],
  );
  const eventsById = useMemo(
    () => new Map(optimisticEvents.map((event) => [event.id, event])),
    [optimisticEvents],
  );
  const pendingTemplateIds = useMemo(
    () => new Set(Object.keys(visiblePendingTemplateMoves)),
    [visiblePendingTemplateMoves],
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

  const isEventDisabled = useCallback(
    (event: AdminScheduleEvent) => pendingTemplateIds.has(event.templateId),
    [pendingTemplateIds],
  );

  const getEventConflicts = useCallback(
    (eventId: string) => conflictByEvent.get(eventId) ?? EMPTY_CONFLICTS,
    [conflictByEvent],
  );

  const handleDragStart = useCallback(() => {
    setIsDragActive(true);
  }, []);

  const handleDragCancel = useCallback(() => {
    setIsDragActive(false);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setIsDragActive(false);

    const activeId = String(event.active.id);
    const activeEvent = eventsById.get(activeId);
    if (!activeEvent) {
      return;
    }

    const over = event.over;
    if (!over) {
      return;
    }
    const overId = String(over.id);

    if (overId === PARKING_DROP_ID) {
      const detachInput = buildDetachTemplateInput(activeEvent);
      if (isSameTemplateMove(activeEvent, detachInput)) {
        return;
      }

      const optimisticMove = toPendingTemplateMove(detachInput);
      setPendingTemplateMoves((currentMoves) => ({
        ...currentMoves,
        [activeEvent.templateId]: optimisticMove,
      }));

      try {
        const result = await moveAdminScheduleTemplateAction(detachInput);
        if (result.error) {
          setPendingTemplateMoves((currentMoves) => removePendingTemplateMove(currentMoves, activeEvent.templateId));
          toast.error(result.error);
          return;
        }

        startTransition(() => {
          router.refresh();
        });
      } catch {
        setPendingTemplateMoves((currentMoves) => removePendingTemplateMove(currentMoves, activeEvent.templateId));
        toast.error("Не удалось переместить карточку");
        return;
      }
      return;
    }

    const overData = over.data.current;
    if (!isScheduleGridDropData(overData) || !over.rect) {
      return;
    }

    const dayOfWeek = overData.dayIndex + 1;
    const draggedTopClientY = getDraggedEventTopClientY(event);

    if (draggedTopClientY === null) {
      return;
    }

    const startMinutes = snapDraggedTopToScheduleMinutes({
      draggedTopClientY,
      rectTop: over.rect.top,
      rectHeight: over.rect.height,
      startMinutes: overData.startMinutes,
      endMinutes: overData.endMinutes,
      stepMinutes: TIME_SLOT_STEP_MINUTES,
    });

    const moveInput = buildMoveTemplateInput(activeEvent, {
      dayOfWeek,
      rowId: overData.rowId,
      startMinutes,
    });
    if (!moveInput) {
      return;
    }
    if (isSameTemplateMove(activeEvent, moveInput)) {
      return;
    }

    const optimisticMove = toPendingTemplateMove(moveInput);
    setPendingTemplateMoves((currentMoves) => ({
      ...currentMoves,
      [activeEvent.templateId]: optimisticMove,
    }));

    try {
      const moveResult = await moveAdminScheduleTemplateAction(moveInput);
      if (moveResult.error) {
        setPendingTemplateMoves((currentMoves) => removePendingTemplateMove(currentMoves, activeEvent.templateId));
        toast.error(moveResult.error);
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setPendingTemplateMoves((currentMoves) => removePendingTemplateMove(currentMoves, activeEvent.templateId));
      toast.error("Не удалось переместить карточку");
      return;
    }
  }, [eventsById, router]);

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
              getEventRowId={(event) => event.classId}
              rowColumnTitle="Класс"
              renderDayColumnOverlay={({ dayIndex, rowId, startMinutes, endMinutes }) =>
                rowId ? (
                  <div className="pointer-events-none absolute inset-0">
                    <ScheduleGridDropCell
                      dayIndex={dayIndex}
                      rowId={rowId}
                      startMinutes={startMinutes}
                      endMinutes={endMinutes}
                    />
                  </div>
                ) : null
              }
              emptyState={{
                icon: <BookOpen />,
                title: "Нет шаблонов",
                description: "На выбранный период шаблон расписания не заполнен.",
              }}
              renderEvent={(event) => (
                <DraggableScheduleEventCard
                  event={event}
                  isDimmed={shouldDimByMetaFilters && !isEventHighlighted(event)}
                  conflicts={getEventConflicts(event.id)}
                  disabled={isEventDisabled(event)}
                  disableTooltip={isDragActive}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
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

function getDraggedEventTopClientY(event: DragEndEvent) {
  const translatedRect = event.active.rect.current.translated;

  if (!translatedRect) {
    const initialRect = event.active.rect.current.initial;
    return initialRect ? initialRect.top + event.delta.y : null;
  }

  return translatedRect.top;
}

function snapDraggedTopToScheduleMinutes({
  draggedTopClientY,
  rectTop,
  rectHeight,
  startMinutes,
  endMinutes,
  stepMinutes,
}: {
  draggedTopClientY: number;
  rectTop: number;
  rectHeight: number;
  startMinutes: number;
  endMinutes: number;
  stepMinutes: number;
}) {
  const clampedOffsetY = clamp(draggedTopClientY - rectTop, 0, Math.max(rectHeight - 1, 0));
  const minutesSpan = Math.max(endMinutes - startMinutes, stepMinutes);
  const minuteOffset = (clampedOffsetY / Math.max(rectHeight, 1)) * minutesSpan;
  const snappedOffset = Math.floor(minuteOffset / stepMinutes) * stepMinutes;
  const maxOffset = Math.max(minutesSpan - stepMinutes, 0);

  return startMinutes + clamp(snappedOffset, 0, maxOffset);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function applyPendingTemplateMoves(
  events: AdminScheduleEvent[],
  pendingTemplateMoves: Record<string, PendingTemplateMove>,
) {
  if (Object.keys(pendingTemplateMoves).length === 0) {
    return events;
  }

  return events.map((event) => {
    const pendingMove = pendingTemplateMoves[event.templateId];

    return pendingMove ? applyPendingTemplateMove(event, pendingMove) : event;
  });
}

function excludeSyncedPendingTemplateMoves(
  events: AdminScheduleEvent[],
  pendingTemplateMoves: Record<string, PendingTemplateMove>,
) {
  if (Object.keys(pendingTemplateMoves).length === 0) {
    return pendingTemplateMoves;
  }

  const nextMoves = Object.fromEntries(
    Object.entries(pendingTemplateMoves).filter(
      ([templateId, move]) => !isTemplateMoveSynced(events, templateId, move),
    ),
  );

  return Object.keys(nextMoves).length === Object.keys(pendingTemplateMoves).length
    ? pendingTemplateMoves
    : nextMoves;
}

function applyPendingTemplateMove(
  event: AdminScheduleEvent,
  pendingMove: PendingTemplateMove,
): AdminScheduleEvent {
  if (
    pendingMove.detached
    || pendingMove.dayOfWeek === null
    || pendingMove.startMinutes === null
    || pendingMove.endMinutes === null
  ) {
    return {
      ...event,
      dayOfWeek: null,
      startMinutes: null,
      endMinutes: null,
      detached: true,
      timeLabel: "Без времени",
    };
  }

  const start = buildDateForScheduleTime(pendingMove.dayOfWeek, pendingMove.startMinutes);
  const end = buildDateForScheduleTime(pendingMove.dayOfWeek, pendingMove.endMinutes);

  return {
    ...event,
    dayOfWeek: pendingMove.dayOfWeek,
    startMinutes: pendingMove.startMinutes,
    endMinutes: pendingMove.endMinutes,
    detached: false,
    start,
    end,
    timeLabel: `${formatTimeLabel(pendingMove.startMinutes)}-${formatTimeLabel(pendingMove.endMinutes)}`,
  };
}

function buildDateForScheduleTime(dayOfWeek: number, minutesFromMidnight: number) {
  return set(
    addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), dayOfWeek - 1),
    {
      hours: Math.floor(minutesFromMidnight / 60),
      minutes: minutesFromMidnight % 60,
      seconds: 0,
      milliseconds: 0,
    },
  );
}

function isTemplateMoveSynced(
  events: AdminScheduleEvent[],
  templateId: string,
  pendingMove: PendingTemplateMove,
) {
  const templateEvents = events.filter((event) => event.templateId === templateId);

  if (templateEvents.length === 0) {
    return false;
  }

  return templateEvents.every((event) => isSameTemplateMove(event, pendingMove));
}

function isSameTemplateMove(
  event: AdminScheduleEvent,
  move: Pick<PendingTemplateMove, "dayOfWeek" | "startMinutes" | "endMinutes">,
) {
  return (
    event.dayOfWeek === move.dayOfWeek
    && event.startMinutes === move.startMinutes
    && event.endMinutes === move.endMinutes
  );
}

function toPendingTemplateMove(
  move: Pick<PendingTemplateMove, "dayOfWeek" | "startMinutes" | "endMinutes">,
): PendingTemplateMove {
  return {
    dayOfWeek: move.dayOfWeek,
    startMinutes: move.startMinutes,
    endMinutes: move.endMinutes,
    detached: move.dayOfWeek === null || move.startMinutes === null || move.endMinutes === null,
  };
}

function removePendingTemplateMove(
  pendingTemplateMoves: Record<string, PendingTemplateMove>,
  templateId: string,
) {
  if (!(templateId in pendingTemplateMoves)) {
    return pendingTemplateMoves;
  }

  const nextMoves = { ...pendingTemplateMoves };
  delete nextMoves[templateId];

  return nextMoves;
}

function isScheduleGridDropData(data: unknown): data is ScheduleGridDropData {
  if (!data || typeof data !== "object") {
    return false;
  }

  return (data as ScheduleGridDropData).type === "schedule-grid-cell";
}
