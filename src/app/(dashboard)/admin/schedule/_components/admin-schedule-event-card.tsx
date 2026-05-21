"use client";

import { memo } from "react";
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
import {
  getScheduleConflictFieldSeverities,
  getScheduleConflictLevel as getConflictLevel,
  type ScheduleConflict,
  type ScheduleConflictField,
  type ScheduleConflictSeverity,
} from "../_lib/schedule-conflicts";

interface AdminScheduleEventCardProps {
  event: AdminScheduleEvent;
  isDimmed?: boolean;
  conflicts?: ScheduleConflict[];
  showActions?: boolean;
  forceFullDetails?: boolean;
  disableTooltip?: boolean;
  onEdit?: (event: AdminScheduleEvent) => void;
  onDelete?: (event: AdminScheduleEvent) => void;
}

type AdminScheduleCardLayout = "title-only" | "title-time" | "full";

export const AdminScheduleEventCard = memo(function AdminScheduleEventCard({
  event,
  isDimmed = false,
  conflicts = [],
  showActions = false,
  forceFullDetails = false,
  disableTooltip = false,
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
  const fieldSeverities = getScheduleConflictFieldSeverities(conflicts);
  const hardConflicts = conflicts.filter((conflict) => conflict.severity === "hard");
  const warningConflicts = conflicts.filter((conflict) => conflict.severity === "warning");
  const inlineCard = (
    <AdminScheduleEventInlineCard
      event={event}
      groupLabel={displayGroupLabel}
      layout={layout}
      isDimmed={isDimmed}
      conflictLevel={conflictLevel}
      fieldSeverities={fieldSeverities}
      showActions={showActions}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );

  if (isDimmed || disableTooltip) {
    return (
      <div
        data-testid="admin-schedule-card"
        data-card-layout={layout}
        data-subject-type={event.subjectType}
        data-duration-minutes={durationMinutes}
        className="block h-full w-full bg-transparent p-0 text-left"
        aria-label={cardLabel}
      >
        {inlineCard}
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
        {inlineCard}
      </TooltipTrigger>
      <TooltipContent
        data-testid="admin-schedule-card-tooltip"
        data-subject-type={event.subjectType}
        data-duration-minutes={durationMinutes}
        align="start"
        side="right"
        sideOffset={8}
        className="block w-96 max-w-none gap-0 bg-popover p-0 text-popover-foreground shadow-md"
      >
        <div
          className={cn(
            "flex min-h-full flex-col gap-3 rounded-lg border px-3 py-2",
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
          {conflicts.length > 0 ? (
            <div className="border-t border-border/60 pt-2">
              {hardConflicts.length > 0 ? (
                <ConflictList
                  title="Жесткие конфликты"
                  severity="hard"
                  conflicts={hardConflicts}
                />
              ) : null}
              {warningConflicts.length > 0 ? (
                <ConflictList
                  title="Предупреждения"
                  severity="warning"
                  conflicts={warningConflicts}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}, areAdminScheduleEventCardPropsEqual);

interface AdminScheduleEventInlineCardProps {
  event: AdminScheduleEvent;
  groupLabel: string;
  layout: AdminScheduleCardLayout;
  isDimmed: boolean;
  conflictLevel: "none" | "warning" | "hard";
  fieldSeverities: Map<ScheduleConflictField, ScheduleConflictSeverity>;
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
  fieldSeverities,
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
        conflictLevel === "hard" && "border-transparent ring-2 ring-inset ring-red-500",
        conflictLevel === "warning" && "border-transparent ring-2 ring-inset ring-amber-500",
        isDimmed && "opacity-35 saturate-50",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div
          className={cn(
            "min-w-0 truncate text-[13px] font-semibold leading-tight text-foreground",
            getConflictTextTone(fieldSeverities.get("subject")),
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
            getConflictTextTone(fieldSeverities.get("time")),
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
              getConflictTextTone(fieldSeverities.get("group")),
            )}
          >
            {groupLabel}
          </div>
          <div
            className={cn(
              "truncate text-xs leading-tight text-muted-foreground",
              getConflictTextTone(fieldSeverities.get("room")),
            )}
          >
            {event.roomName}
          </div>
          <div
            className={cn(
              "truncate text-xs leading-tight text-muted-foreground",
              getConflictTextTone(fieldSeverities.get("teacher")),
            )}
          >
            {event.teacherName}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ConflictList({
  title,
  severity,
  conflicts,
}: {
  title: string;
  severity: ScheduleConflictSeverity;
  conflicts: ScheduleConflict[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wide",
          severity === "hard" ? "text-red-700" : "text-amber-700",
        )}
      >
        {title}
      </div>
      <ul className="space-y-1">
        {conflicts.map((conflict, index) => (
          <li key={`${conflict.code}:${index}`} className="text-xs leading-snug text-foreground">
            {conflict.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function getConflictTextTone(severity: ScheduleConflictSeverity | undefined) {
  if (severity === "hard") {
    return "text-red-700";
  }

  if (severity === "warning") {
    return "text-amber-700";
  }

  return null;
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

function areAdminScheduleEventCardPropsEqual(
  previousProps: AdminScheduleEventCardProps,
  nextProps: AdminScheduleEventCardProps,
) {
  return (
    previousProps.event === nextProps.event &&
    previousProps.isDimmed === nextProps.isDimmed &&
    previousProps.conflicts === nextProps.conflicts &&
    previousProps.showActions === nextProps.showActions &&
    previousProps.forceFullDetails === nextProps.forceFullDetails &&
    previousProps.disableTooltip === nextProps.disableTooltip &&
    previousProps.onEdit === nextProps.onEdit &&
    previousProps.onDelete === nextProps.onDelete
  );
}
