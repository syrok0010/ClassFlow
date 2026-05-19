"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { AdminScheduleEvent } from "../_lib/admin-schedule-types";
import { AdminScheduleEventCard } from "./admin-schedule-event-card";
import type { EventConflict } from "./admin-schedule-conflicts";

export const PARKING_DROP_ID = "parking-drop-zone";

type ScheduleEventHandlers = {
  onEdit: (event: AdminScheduleEvent) => void;
  onDelete: (event: AdminScheduleEvent) => void;
};

export function DraggableScheduleEventCard({
  event,
  isDimmed,
  conflicts,
  onEdit,
  onDelete,
}: {
  event: AdminScheduleEvent;
  isDimmed: boolean;
  conflicts: EventConflict[];
} & ScheduleEventHandlers) {
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

export function TemporaryScheduleArea({
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
} & ScheduleEventHandlers) {
  const { isOver, setNodeRef } = useDroppable({ id: PARKING_DROP_ID });

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
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

export function GridDropOverlay({
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
  const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayIndex = new Date(year, (month ?? 1) - 1, day ?? 1).getDay();
  const dayCode = dayMap[dayIndex] ?? "mon";

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
