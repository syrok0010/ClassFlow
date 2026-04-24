"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, Trash2 } from "lucide-react";
import { differenceInMinutes } from "date-fns";
import { SUBJECT_CARD_TONES, SUBJECT_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { AdminScheduleEvent } from "../_lib/admin-schedule-types";
import type { EventConflict } from "./admin-schedule-conflicts";

interface AdminScheduleEventCardProps {
  event: AdminScheduleEvent;
  isDimmed?: boolean;
  conflicts?: EventConflict[];
  showActions?: boolean;
  forceFullDetails?: boolean;
  onEdit?: (event: AdminScheduleEvent) => void;
  onDelete?: (event: AdminScheduleEvent) => void;
}

type AdminScheduleCardLayout = "title-only" | "title-time" | "full";

export function AdminScheduleEventCard({
  event,
  isDimmed = false,
  conflicts = [],
  showActions = false,
  forceFullDetails = false,
  onEdit,
  onDelete,
}: AdminScheduleEventCardProps) {
  const durationMinutes = getEventDurationMinutes(event);
  const layout = forceFullDetails ? "full" : getCardLayout(durationMinutes);
  const subjectTypeLabel = SUBJECT_LABELS[event.subjectType];
  const groupLabel = event.groupName === event.className ? "Весь класс" : event.groupName;
  const displayGroupLabel = event.detached && groupLabel === "Весь класс" ? event.className : groupLabel;
  const cardLabel = `${event.subjectName}, ${event.timeLabel}, ${displayGroupLabel}, ${event.roomName}, ${event.teacherName}`;
  const conflictLevel = getConflictLevel(conflicts);
  const conflictFields = new Set(conflicts.flatMap((conflict) => conflict.fields));

  if (isDimmed) {
    return (
      <div
        data-testid="admin-schedule-card"
        data-card-layout={layout}
        data-subject-type={event.subjectType}
        data-duration-minutes={durationMinutes}
        className="block h-full w-full bg-transparent p-0 text-left"
        aria-label={cardLabel}
      >
        <AdminScheduleEventInlineCard
          event={event}
          groupLabel={displayGroupLabel}
          layout={layout}
          isDimmed
          conflictLevel={conflictLevel}
          conflictFields={conflictFields}
        />
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={<div />}
        data-testid="admin-schedule-card"
        data-card-layout={layout}
        data-subject-type={event.subjectType}
        data-duration-minutes={durationMinutes}
        className="block h-full w-full bg-transparent p-0 text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-label={cardLabel}
      >
        <AdminScheduleEventInlineCard
          event={event}
          groupLabel={displayGroupLabel}
          layout={layout}
          isDimmed={isDimmed}
          conflictLevel={conflictLevel}
          conflictFields={conflictFields}
          showActions={showActions}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </TooltipTrigger>
      <TooltipContent
        data-testid="admin-schedule-card-tooltip"
        data-subject-type={event.subjectType}
        data-duration-minutes={durationMinutes}
        align="start"
        side="right"
        sideOffset={8}
        className="block w-80 max-w-none gap-0 bg-popover p-0 text-popover-foreground shadow-md"
      >
        <div
          className={cn(
            "flex min-h-full flex-col gap-2 rounded-lg border px-3 py-2",
            SUBJECT_CARD_TONES[event.subjectType],
          )}
        >
          <div className="wrap-break-word whitespace-normal text-sm font-semibold leading-tight text-foreground">
            {event.subjectName}
          </div>
          <div className="text-xs leading-tight text-muted-foreground">{subjectTypeLabel}</div>
          <div className="text-xs font-medium leading-tight text-muted-foreground">{event.timeLabel}</div>
          <div className="wrap-break-word whitespace-normal text-xs leading-tight text-muted-foreground">
            {groupLabel}
          </div>
          <div className="wrap-break-word whitespace-normal text-xs leading-tight text-muted-foreground">
            {event.roomName}
          </div>
          <div className="wrap-break-word whitespace-normal text-xs leading-tight text-muted-foreground">
            {event.teacherName}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface AdminScheduleEventInlineCardProps {
  event: AdminScheduleEvent;
  groupLabel: string;
  layout: AdminScheduleCardLayout;
  isDimmed: boolean;
  conflictLevel: "none" | "warning" | "hard";
  conflictFields: Set<string>;
  showActions?: boolean;
  onEdit?: (event: AdminScheduleEvent) => void;
  onDelete?: (event: AdminScheduleEvent) => void;
}

function AdminScheduleEventInlineCard({
  event,
  groupLabel,
  layout,
  isDimmed,
  conflictLevel,
  conflictFields,
  showActions = false,
  onEdit,
  onDelete,
}: AdminScheduleEventInlineCardProps) {
  return (
    <div
      className={cn(
        "group/schedule-card flex h-full w-full flex-col overflow-hidden rounded-lg border p-1 text-left shadow-sm",
        SUBJECT_CARD_TONES[event.subjectType],
        layout === "title-only" ? "justify-center" : "justify-start",
        conflictLevel === "hard" && "border-red-500 border-2",
        conflictLevel === "warning" && "border-amber-500 border-2",
        isDimmed && "opacity-35 saturate-50",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div
          className={cn(
            "min-w-0 truncate text-[13px] font-semibold leading-tight text-foreground",
            conflictFields.has("subject") && conflictLevel === "hard" && "text-red-700",
            conflictFields.has("subject") && conflictLevel === "warning" && "text-amber-700",
          )}
        >
          {event.subjectName}
        </div>

        {showActions ? (
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/schedule-card:opacity-100 group-focus-within/schedule-card:opacity-100">
            <button
              type="button"
              className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-black/10 hover:text-foreground"
              onClick={(evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                onEdit?.(event);
              }}
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-black/10 hover:text-destructive"
              onClick={(evt) => {
                evt.preventDefault();
                evt.stopPropagation();
                onDelete?.(event);
              }}
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ) : null}
      </div>

      {layout === "title-time" || layout === "full" ? (
        <div
          className={cn(
            "mt-1 truncate text-xs font-medium leading-tight text-muted-foreground",
            conflictFields.has("time") && conflictLevel === "hard" && "text-red-700",
            conflictFields.has("time") && conflictLevel === "warning" && "text-amber-700",
          )}
        >
          {event.detached ? "Без времени" : event.timeLabel}
        </div>
      ) : null}

      {layout === "full" ? (
        <>
          <div
            className={cn(
              "truncate text-xs leading-tight text-muted-foreground",
              conflictFields.has("group") && conflictLevel === "hard" && "text-red-700",
              conflictFields.has("group") && conflictLevel === "warning" && "text-amber-700",
            )}
          >
            {groupLabel}
          </div>
          <div
            className={cn(
              "truncate text-xs leading-tight text-muted-foreground",
              conflictFields.has("room") && conflictLevel === "hard" && "text-red-700",
              conflictFields.has("room") && conflictLevel === "warning" && "text-amber-700",
            )}
          >
            {event.roomName}
          </div>
          <div
            className={cn(
              "truncate text-xs leading-tight text-muted-foreground",
              conflictFields.has("teacher") && conflictLevel === "hard" && "text-red-700",
              conflictFields.has("teacher") && conflictLevel === "warning" && "text-amber-700",
            )}
          >
            {event.teacherName}
          </div>
        </>
      ) : null}
    </div>
  );
}

function getConflictLevel(conflicts: EventConflict[]) {
  if (conflicts.some((conflict) => conflict.severity === "hard")) {
    return "hard" as const;
  }
  if (conflicts.some((conflict) => conflict.severity === "warning")) {
    return "warning" as const;
  }
  return "none" as const;
}

function getCardLayout(durationMinutes: number): AdminScheduleCardLayout {
  if (durationMinutes <= 15) {
    return "title-only";
  }

  if (durationMinutes <= 25) {
    return "title-time";
  }

  return "full";
}

function getEventDurationMinutes(event: AdminScheduleEvent): number {
  return differenceInMinutes(event.end, event.start, { roundingMethod: "round" });
}
