"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { AdminScheduleEvent } from "../_lib/admin-schedule-types";
import type { ScheduleConflict } from "../_lib/schedule-conflicts";
import { AdminScheduleEventCard } from "./admin-schedule-event-card";

export const PARKING_DROP_ID = "parking-drop-zone";
const EMPTY_CONFLICTS: ScheduleConflict[] = [];

export type ScheduleGridDropData = {
  type: "schedule-grid-cell";
  dayIndex: number;
  rowId: string;
  startMinutes: number;
  endMinutes: number;
};

type ScheduleEventHandlers = {
  onEdit: (event: AdminScheduleEvent) => void;
  onDelete: (event: AdminScheduleEvent) => void;
};

export function DraggableScheduleEventCard({
  event,
  isDimmed,
  conflicts,
  disabled = false,
  disableTooltip = false,
  onEdit,
  onDelete,
}: {
  event: AdminScheduleEvent;
  isDimmed: boolean;
  conflicts: ScheduleConflict[];
  disabled?: boolean;
  disableTooltip?: boolean;
} & ScheduleEventHandlers) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "relative",
        isDragging && "z-50 opacity-70",
        disabled && "cursor-progress opacity-85",
      )}
      {...listeners}
      {...attributes}
    >
      <AdminScheduleEventCard
        event={event}
        isDimmed={isDimmed}
        conflicts={conflicts}
        showActions
        forceFullDetails={event.detached}
        disableTooltip={disableTooltip}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

export function TemporaryScheduleArea({
  events,
  conflictByEvent,
  shouldDimByMetaFilters,
  isEventHighlighted,
  isEventDisabled,
  disableTooltips = false,
  onCreate,
  onEdit,
  onDelete,
}: {
  events: AdminScheduleEvent[];
  conflictByEvent: Map<string, ScheduleConflict[]>;
  shouldDimByMetaFilters: boolean;
  isEventHighlighted: (event: AdminScheduleEvent) => boolean;
  isEventDisabled: (event: AdminScheduleEvent) => boolean;
  disableTooltips?: boolean;
  onCreate: () => void;
} & ScheduleEventHandlers) {
  const { isOver, setNodeRef } = useDroppable({ id: PARKING_DROP_ID });

  return (
    <div className="relative z-10 rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Временная область</span>
        <Button size="sm" variant="outline" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          Добавить
        </Button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[70vh] flex-col gap-2 p-2",
          isOver && "bg-primary/5",
        )}
      >
        {events.map((event) => (
          <DraggableScheduleEventCard
            key={event.id}
            event={event}
            isDimmed={shouldDimByMetaFilters && !isEventHighlighted(event)}
            conflicts={conflictByEvent.get(event.id) ?? EMPTY_CONFLICTS}
            disabled={isEventDisabled(event)}
            disableTooltip={disableTooltips}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

export function ScheduleGridDropCell({
  dayIndex,
  rowId,
  startMinutes,
  endMinutes,
}: {
  dayIndex: number;
  rowId: string;
  startMinutes: number;
  endMinutes: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell:${dayIndex}:${rowId}`,
    data: {
      type: "schedule-grid-cell",
      dayIndex,
      rowId,
      startMinutes,
      endMinutes,
    } satisfies ScheduleGridDropData,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "pointer-events-auto absolute inset-0 rounded-sm",
        isOver && "bg-primary/5 ring-1 ring-inset ring-primary/20",
      )}
    />
  );
}
