"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { differenceInMinutes } from "date-fns";
import { SUBJECT_CARD_TONES, SUBJECT_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { AdminScheduleEvent } from "../_lib/admin-schedule-types";

interface AdminScheduleEventCardProps {
  event: AdminScheduleEvent;
  isDimmed?: boolean;
}

type AdminScheduleCardLayout = "title-only" | "title-time" | "full";

export function AdminScheduleEventCard({ event, isDimmed = false }: AdminScheduleEventCardProps) {
  const durationMinutes = getEventDurationMinutes(event);
  const layout = getCardLayout(durationMinutes);
  const subjectTypeLabel = SUBJECT_LABELS[event.subjectType];
  const groupLabel = event.groupName === event.className ? "Весь класс" : event.groupName;
  const cardLabel = `${event.subjectName}, ${event.timeLabel}, ${groupLabel}, ${event.roomName}, ${event.teacherName}`;

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
        <AdminScheduleEventInlineCard event={event} groupLabel={groupLabel} layout={layout} isDimmed />
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        data-testid="admin-schedule-card"
        data-card-layout={layout}
        data-subject-type={event.subjectType}
        data-duration-minutes={durationMinutes}
        className="block h-full w-full bg-transparent p-0 text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-label={cardLabel}
      >
        <AdminScheduleEventInlineCard event={event} groupLabel={groupLabel} layout={layout} isDimmed={isDimmed} />
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
}

function AdminScheduleEventInlineCard({
  event,
  groupLabel,
  layout,
  isDimmed,
}: AdminScheduleEventInlineCardProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-lg border p-1 text-left shadow-sm",
        SUBJECT_CARD_TONES[event.subjectType],
        layout === "title-only" ? "justify-center" : "justify-start",
        isDimmed && "opacity-35 saturate-50",
      )}
    >
      <div className="truncate text-[13px] font-semibold leading-tight text-foreground">{event.subjectName}</div>

      {layout === "title-time" || layout === "full" ? (
        <div className="mt-1 truncate text-xs font-medium leading-tight text-muted-foreground">{event.timeLabel}</div>
      ) : null}

      {layout === "full" ? (
        <>
          <div className="truncate text-xs leading-tight text-muted-foreground">{groupLabel}</div>
          <div className="truncate text-xs leading-tight text-muted-foreground">{event.roomName}</div>
          <div className="truncate text-xs leading-tight text-muted-foreground">{event.teacherName}</div>
        </>
      ) : null}
    </div>
  );
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
