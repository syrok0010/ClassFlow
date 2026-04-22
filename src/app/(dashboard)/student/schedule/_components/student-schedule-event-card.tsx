"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SUBJECT_CARD_TONES, SUBJECT_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { StudentScheduleEvent } from "../_lib/student-schedule-types";

interface StudentScheduleEventCardProps {
  event: StudentScheduleEvent;
}

type StudentScheduleCardLayout = "title-only" | "title-time" | "full";

export function StudentScheduleEventCard({ event }: StudentScheduleEventCardProps) {
  const durationMinutes = getEventDurationMinutes(event);
  const layout = getCardLayout(durationMinutes);
  const subjectTypeLabel = SUBJECT_LABELS[event.subjectType];
  const cardLabel = [
    event.subjectName,
    subjectTypeLabel,
    event.timeLabel,
    event.roomName,
    event.teacherName,
  ].join(", ");

  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger
          data-testid="student-schedule-card"
          data-card-layout={layout}
          data-subject-type={event.subjectType}
          data-duration-minutes={durationMinutes}
          aria-label={cardLabel}
          className="block h-full w-full bg-transparent p-0 text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <StudentScheduleEventInlineCard event={event} layout={layout} />
        </TooltipTrigger>
        <TooltipContent
          data-testid="student-schedule-card-tooltip"
          data-subject-type={event.subjectType}
          data-duration-minutes={durationMinutes}
          align="start"
          side="right"
          sideOffset={8}
          className="block w-80 max-w-none gap-0 bg-popover p-0 text-popover-foreground shadow-md"
        >
          <StudentScheduleEventTooltipCard event={event} subjectTypeLabel={subjectTypeLabel} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface StudentScheduleEventInlineCardProps {
  event: StudentScheduleEvent;
  layout: StudentScheduleCardLayout;
}

function StudentScheduleEventInlineCard({
  event,
  layout,
}: StudentScheduleEventInlineCardProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden border rounded-lg px-1 text-left shadow-sm",
        SUBJECT_CARD_TONES[event.subjectType],
        layout === "title-only" ? "justify-center py-0" : "justify-start py-0.5"
      )}
    >
      <div className="truncate rounded-lg text-xs font-semibold leading-tight text-foreground">
        {event.subjectName}
      </div>

      {layout === "title-time" || layout === "full" ? (
        <div className="truncate rounded-lg text-xs font-medium leading-tight text-muted-foreground">
          {event.timeLabel}
        </div>
      ) : null}

      {layout === "full" ? (
        <>
          <div className="truncate text-xs leading-tight text-muted-foreground">
            {event.roomName}
          </div>
          <div className="truncate text-xs leading-tight text-muted-foreground">
            {event.teacherName}
          </div>
        </>
      ) : null}
    </div>
  );
}

interface StudentScheduleEventTooltipCardProps {
  event: StudentScheduleEvent;
  subjectTypeLabel: string;
}

function StudentScheduleEventTooltipCard({
  event,
  subjectTypeLabel,
}: StudentScheduleEventTooltipCardProps) {
  return (
    <div
      className={cn(
        "flex min-h-full flex-col gap-2 px-3 py-2 border rounded-lg",
        SUBJECT_CARD_TONES[event.subjectType]
      )}
    >
      <div className="wrap-break-word whitespace-normal text-sm font-semibold leading-tight text-foreground">
        {event.subjectName}
      </div>
      <div className="text-xs leading-tight text-muted-foreground">{subjectTypeLabel}</div>
      <div className="text-xs font-medium leading-tight text-muted-foreground">
        {event.timeLabel}
      </div>
      <div className="wrap-break-word whitespace-normal text-xs leading-tight text-muted-foreground">
        {event.roomName}
      </div>
      <div className="wrap-break-word whitespace-normal text-xs leading-tight text-muted-foreground">
        {event.teacherName}
      </div>
    </div>
  );
}

function getCardLayout(durationMinutes: number): StudentScheduleCardLayout {
  if (durationMinutes <= 15) {
    return "title-only";
  }

  if (durationMinutes <= 25) {
    return "title-time";
  }

  return "full";
}

function getEventDurationMinutes(event: StudentScheduleEvent): number {
  return Math.round((event.end.getTime() - event.start.getTime()) / 60_000);
}
