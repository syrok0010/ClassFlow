"use client";

import { differenceInMinutes } from "date-fns";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SUBJECT_CARD_TONES, SUBJECT_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import type { StudentScheduleEvent } from "./student-schedule-types";

interface StudentScheduleEventCardProps {
  event: StudentScheduleEvent;
  inlineAction?: React.ReactNode;
  inlineCardClassName?: string;
}

type StudentScheduleCardLayout = "title-only" | "title-time" | "full";

export function StudentScheduleEventCard({
  event,
  inlineAction,
  inlineCardClassName,
}: StudentScheduleEventCardProps) {
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
          render={inlineAction ? <div /> : undefined}
          data-testid="student-schedule-card"
          data-card-layout={layout}
          data-subject-type={event.subjectType}
          data-duration-minutes={durationMinutes}
          aria-label={cardLabel}
          className="block h-full w-full bg-transparent p-0 text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <StudentScheduleEventInlineCard
            event={event}
            layout={layout}
            inlineAction={inlineAction}
            inlineCardClassName={inlineCardClassName}
          />
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
  inlineAction?: React.ReactNode;
  inlineCardClassName?: string;
}

function StudentScheduleEventInlineCard({
  event,
  layout,
  inlineAction,
  inlineCardClassName,
}: StudentScheduleEventInlineCardProps) {
  const hasInlineAction = Boolean(inlineAction);

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-lg border px-1 text-left shadow-sm",
        SUBJECT_CARD_TONES[event.subjectType],
        inlineCardClassName,
        layout === "title-only" ? "justify-center py-0" : "justify-start py-0.5"
      )}
    >
      {hasInlineAction ? (
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <div className="rounded-lg text-xs font-semibold leading-tight text-foreground whitespace-normal break-words">
              {event.subjectName}
            </div>

            {layout === "title-time" || layout === "full" ? (
              <div className="mt-0.5 rounded-lg text-xs font-medium leading-tight text-muted-foreground whitespace-normal break-words">
                {event.timeLabel}
              </div>
            ) : null}
          </div>

          <div className="shrink-0">{inlineAction}</div>
        </div>
      ) : (
        <>
          <div className="truncate text-xs font-semibold leading-tight text-foreground">
            {event.subjectName}
          </div>

          {layout === "title-time" || layout === "full" ? (
            <div className="truncate text-xs font-medium leading-tight text-muted-foreground">
              {event.timeLabel}
            </div>
          ) : null}
        </>
      )}

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
        "flex min-h-full flex-col gap-2 rounded-lg border px-3 py-2",
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
  return differenceInMinutes(event.end, event.start, { roundingMethod: "round" });
}
