"use client";

import {
  startTransition,
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { addDays, set, startOfWeek } from "date-fns";
import type { DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";

import { TIME_SLOT_STEP_MINUTES, formatTimeLabel } from "@/features/schedule/lib/date-utils";

import { moveAdminScheduleTemplateAction } from "../_actions/schedule-actions";
import type { AdminScheduleEvent } from "../_lib/admin-schedule-types";
import {
  buildDetachTemplateInput,
  buildMoveTemplateInput,
} from "../_lib/admin-schedule-template-commands";
import type { AdminScheduleTemplateTimeMoveInput } from "../_lib/schedule-mutations-schema";
import { PARKING_DROP_ID, type ScheduleGridDropData } from "./schedule-dnd-components";

type OptimisticTemplateMoveAction = {
  templateId: string;
  move: AdminScheduleTemplateTimeMoveInput;
};

export function useAdminScheduleDnd(
  events: AdminScheduleEvent[],
  lessonDurationByGroupSubject: Record<string, number>,
) {
  const router = useRouter();
  const [isDragActive, setIsDragActive] = useState(false);
  const [savingTemplateIds, setSavingTemplateIds] = useState<string[]>([]);
  const [isRefreshPending, startRefreshTransition] = useTransition();
  const [optimisticEvents, applyOptimisticMove] = useOptimistic(
    events,
    (
      currentEvents: AdminScheduleEvent[],
      action: OptimisticTemplateMoveAction,
    ) => currentEvents.map((event) =>
      event.templateId === action.templateId
        ? applyTemplateMoveToEvent(event, action.move)
        : event,
    ),
  );

  const eventsById = useMemo(
    () => new Map(optimisticEvents.map((event) => [event.id, event])),
    [optimisticEvents],
  );
  const savingTemplateIdSet = useMemo(
    () => new Set(savingTemplateIds),
    [savingTemplateIds],
  );

  const isEventDisabled = useCallback(
    (event: AdminScheduleEvent) =>
      isRefreshPending || savingTemplateIdSet.has(event.templateId),
    [isRefreshPending, savingTemplateIdSet],
  );

  const handleDragStart = useCallback(() => {
    setIsDragActive(true);
  }, []);

  const handleDragCancel = useCallback(() => {
    setIsDragActive(false);
  }, []);

  const saveMove = useCallback(
    async (
      activeEvent: AdminScheduleEvent,
      moveInput: AdminScheduleTemplateTimeMoveInput,
    ) => {
      const templateId = activeEvent.templateId;

      setSavingTemplateIds((currentIds) =>
        currentIds.includes(templateId)
          ? currentIds
          : [...currentIds, templateId],
      );

      startTransition(() => {
        applyOptimisticMove({ templateId, move: moveInput });
      });

      try {
        const result = await moveAdminScheduleTemplateAction(moveInput);

        if (result.error) {
          startRefreshTransition(() => {
            router.refresh();
          });
          toast.error(result.error);
          return;
        }

        startRefreshTransition(() => {
          router.refresh();
        });
      } catch {
        startRefreshTransition(() => {
          router.refresh();
        });
        toast.error("Не удалось переместить карточку");
      } finally {
        setSavingTemplateIds((currentIds) =>
          currentIds.filter((id) => id !== templateId),
        );
      }
    },
    [applyOptimisticMove, router],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setIsDragActive(false);

      const activeId = String(event.active.id);
      const activeEvent = eventsById.get(activeId);
      if (!activeEvent) {
        return;
      }

      const moveInput = getMoveInputFromDragEndEvent(
        event,
        activeEvent,
        lessonDurationByGroupSubject,
      );
      if (!moveInput || isSameTemplateMove(activeEvent, moveInput)) {
        return;
      }

      await saveMove(activeEvent, moveInput);
    },
    [eventsById, lessonDurationByGroupSubject, saveMove],
  );

  return {
    optimisticEvents,
    isDragActive,
    isEventDisabled,
    handleDragStart,
    handleDragCancel,
    handleDragEnd,
  };
}

function getMoveInputFromDragEndEvent(
  event: DragEndEvent,
  activeEvent: AdminScheduleEvent,
  lessonDurationByGroupSubject: Record<string, number>,
) {
  const over = event.over;

  if (!over) {
    return null;
  }

  if (String(over.id) === PARKING_DROP_ID) {
    return buildDetachTemplateInput(activeEvent);
  }

  const overData = over.data.current;
  if (!isScheduleGridDropData(overData) || !over.rect) {
    return null;
  }

  const draggedTopClientY = getDraggedEventTopClientY(event);
  if (draggedTopClientY === null) {
    return null;
  }

  const startMinutes = snapDraggedTopToScheduleMinutes({
    draggedTopClientY,
    rectTop: over.rect.top,
    rectHeight: over.rect.height,
    startMinutes: overData.startMinutes,
    endMinutes: overData.endMinutes,
    stepMinutes: TIME_SLOT_STEP_MINUTES,
  });

  return buildMoveTemplateInput(activeEvent, {
    dayOfWeek: overData.dayIndex + 1,
    rowId: overData.rowId,
    startMinutes,
  }, lessonDurationByGroupSubject);
}

function applyTemplateMoveToEvent(
  event: AdminScheduleEvent,
  move: AdminScheduleTemplateTimeMoveInput,
): AdminScheduleEvent {
  if (
    move.dayOfWeek === null
    || move.startMinutes === null
    || move.endMinutes === null
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

  return {
    ...event,
    dayOfWeek: move.dayOfWeek,
    startMinutes: move.startMinutes,
    endMinutes: move.endMinutes,
    detached: false,
    start: buildDateForScheduleTime(move.dayOfWeek, move.startMinutes),
    end: buildDateForScheduleTime(move.dayOfWeek, move.endMinutes),
    timeLabel: `${formatTimeLabel(move.startMinutes)}-${formatTimeLabel(move.endMinutes)}`,
  };
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
  const clampedOffsetY = clamp(
    draggedTopClientY - rectTop,
    0,
    Math.max(rectHeight - 1, 0),
  );
  const minutesSpan = Math.max(endMinutes - startMinutes, stepMinutes);
  const minuteOffset = (clampedOffsetY / Math.max(rectHeight, 1)) * minutesSpan;
  const snappedOffset = Math.floor(minuteOffset / stepMinutes) * stepMinutes;
  const maxOffset = Math.max(minutesSpan - stepMinutes, 0);

  return startMinutes + clamp(snappedOffset, 0, maxOffset);
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

function isSameTemplateMove(
  event: AdminScheduleEvent,
  move: Pick<AdminScheduleTemplateTimeMoveInput, "dayOfWeek" | "startMinutes" | "endMinutes">,
) {
  return (
    event.dayOfWeek === move.dayOfWeek
    && event.startMinutes === move.startMinutes
    && event.endMinutes === move.endMinutes
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isScheduleGridDropData(data: unknown): data is ScheduleGridDropData {
  if (!data || typeof data !== "object") {
    return false;
  }

  return (data as ScheduleGridDropData).type === "schedule-grid-cell";
}
