"use client";

import { differenceInMinutes } from "date-fns";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SUBJECT_CARD_TONES } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { TeacherScheduleEvent } from "../_lib/teacher-schedule-types";

interface TeacherScheduleEventCardProps {
  event: TeacherScheduleEvent;
}

type TeacherScheduleCardLayout = "subject-only" | "subject-group" | "full";

export function TeacherScheduleEventCard({ event }: TeacherScheduleEventCardProps) {
  const durationMinutes = getEventDurationMinutes(event);
  const layout = getCardLayout(durationMinutes);
  const tooltipStatusLabel = event.statusLabel;
  const cardLabel = [
    event.subjectName,
    event.groupName,
    event.roomName,
    event.timeLabel,
    event.subjectTypeLabel,
    tooltipStatusLabel,
  ].join(", ");

  return (
    <Tooltip>
      <TooltipTrigger
        data-testid="teacher-schedule-card"
        data-card-layout={layout}
        data-subject-type={event.subjectType}
        data-duration-minutes={durationMinutes}
        data-status={event.status}
        aria-label={cardLabel}
        className="block h-full w-full bg-transparent p-0 text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <TeacherScheduleEventInlineCard event={event} layout={layout} />
      </TooltipTrigger>
      <TooltipContent
        data-testid="teacher-schedule-card-tooltip"
        data-subject-type={event.subjectType}
        data-duration-minutes={durationMinutes}
        data-status={event.status}
        align="start"
        side="right"
        sideOffset={8}
        className="block w-80 max-w-none gap-0 bg-popover p-0 text-popover-foreground shadow-md"
      >
        <TeacherScheduleEventTooltipCard
          event={event}
          tooltipStatusLabel={tooltipStatusLabel}
        />
      </TooltipContent>
    </Tooltip>
  );
}

interface TeacherScheduleEventInlineCardProps {
  event: TeacherScheduleEvent;
  layout: TeacherScheduleCardLayout;
}

function TeacherScheduleEventInlineCard({
  event,
  layout,
}: TeacherScheduleEventInlineCardProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-lg border px-1 text-left shadow-sm",
        SUBJECT_CARD_TONES[event.subjectType],
        layout === "subject-only" ? "justify-center py-0" : "justify-start py-0.5"
      )}
    >
      <div className="truncate rounded-lg text-xs font-semibold leading-tight text-foreground">
        {event.subjectName}
      </div>

      {layout === "subject-group" || layout === "full" ? (
        <div className="truncate text-xs leading-tight text-muted-foreground">
          {event.groupName}
        </div>
      ) : null}

      {layout === "full" ? (
        <>
          <div className="truncate text-xs leading-tight text-muted-foreground">
            {event.roomName}
          </div>
          <div className="truncate text-xs font-medium leading-tight text-muted-foreground">
            {event.timeLabel}
          </div>
        </>
      ) : null}
    </div>
  );
}

interface TeacherScheduleEventTooltipCardProps {
  event: TeacherScheduleEvent;
  tooltipStatusLabel: string;
}

function TeacherScheduleEventTooltipCard({
  event,
  tooltipStatusLabel,
}: TeacherScheduleEventTooltipCardProps) {
  return (
    <div
      className={cn(
        "flex min-h-full flex-col gap-2 rounded-lg border px-3 py-2",
        SUBJECT_CARD_TONES[event.subjectType]
      )}
    >
      <div className="wrap-break-word whitespace-normal text-sm font-semibold leading-tight text-foreground">
        {event.subjectName}
      </div>
      <div className="text-xs font-medium leading-tight text-muted-foreground">
        {event.timeLabel}
      </div>
      <div className="wrap-break-word whitespace-normal text-xs leading-tight text-muted-foreground">
        {event.roomName}
      </div>
      <div className="wrap-break-word whitespace-normal text-xs leading-tight text-muted-foreground">
        {event.groupName}
      </div>
      <div className="text-xs leading-tight text-muted-foreground">
        {event.subjectTypeLabel}
      </div>
      <div className="text-xs leading-tight text-muted-foreground">{tooltipStatusLabel}</div>
    </div>
  );
}

function getCardLayout(durationMinutes: number): TeacherScheduleCardLayout {
  if (durationMinutes <= 15) {
    return "subject-only";
  }

  if (durationMinutes <= 25) {
    return "subject-group";
  }

  return "full";
}

function getEventDurationMinutes(event: TeacherScheduleEvent): number {
  return differenceInMinutes(event.end, event.start, { roundingMethod: "round" });
}
