"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useFittingDimensions } from "../_hooks/use-fitting-dimensions";
import type { StudentScheduleEvent } from "../_lib/student-schedule-types";

interface StudentScheduleEventCardProps {
  event: StudentScheduleEvent;
}

type CompactPreviewTier = "xs" | "sm" | "lg";

type CompactPreviewPreset = {
  containerClassName: string;
  textClassName: string;
};

const FIT_TOLERANCE_PX = 2;
const COMPACT_PREVIEW_PRESETS: Record<CompactPreviewTier, CompactPreviewPreset> = {
  xs: {
    containerClassName: "px-1.5 py-0.5",
    textClassName: "line-clamp-1 text-xs leading-tight",
  },
  sm: {
    containerClassName: "px-2 py-1",
    textClassName: "line-clamp-2 text-xs leading-tight",
  },
  lg: {
    containerClassName: "px-2 py-1",
    textClassName: "line-clamp-2 text-sm leading-tight",
  },
};

export function StudentScheduleEventCard({ event }: StudentScheduleEventCardProps) {
  const { available, containerRef, full, measureRef } = useFittingDimensions();

  const titleLines = [
    event.subjectName,
    event.timeLabel,
    event.teacherName,
    event.roomName,
  ];
  const cardLabel = titleLines.join(", ");
  const fitsFully = full > 0 && full <= available + FIT_TOLERANCE_PX;
  const compactPreviewPreset = getCompactPreviewPreset(available);

  const measurementContent = (
    <div
      ref={measureRef}
      aria-hidden={true}
      className="pointer-events-none absolute inset-x-0 top-0 invisible"
    >
      <StudentScheduleEventDetails event={event} variant="inline" />
    </div>
  );

  if (fitsFully) {
    return (
      <div ref={containerRef} className="relative h-full">
        {measurementContent}
        <div
          data-testid="student-schedule-card"
          data-card-mode="full"
          data-time-label={event.timeLabel}
          className="h-full"
        >
          <StudentScheduleEventDetails event={event} variant="inline" />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full">
      {measurementContent}
      <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger
            data-testid="student-schedule-card"
            data-card-mode="compact"
            data-time-label={event.timeLabel}
            aria-label={cardLabel}
            delay={0}
            className="block h-full w-full rounded-[inherit] bg-transparent p-0 text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <div className="h-full">
              <StudentScheduleEventCompactPreview
                subjectName={event.subjectName}
                preset={compactPreviewPreset}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent
            data-testid="student-schedule-card-tooltip"
            data-time-label={event.timeLabel}
            align="start"
            side="right"
            sideOffset={8}
            className="block w-80 max-w-none gap-0 rounded-lg bg-popover p-0 text-popover-foreground shadow-md ring-1 ring-foreground/10 *:aria-hidden:bg-popover"
          >
            <StudentScheduleEventDetails event={event} variant="overlay" />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

interface StudentScheduleEventCompactPreviewProps {
  preset: CompactPreviewPreset;
  subjectName: string;
}

function StudentScheduleEventCompactPreview({
  preset,
  subjectName,
}: StudentScheduleEventCompactPreviewProps) {
  return (
    <div className={cn("flex h-full items-center text-left", preset.containerClassName)}>
      <div
        className={cn(
          "w-full wrap-break-word font-semibold text-foreground",
          preset.textClassName
        )}
      >
        {subjectName}
      </div>
    </div>
  );
}

interface StudentScheduleEventDetailsProps {
  event: StudentScheduleEvent;
  variant: "inline" | "overlay";
}

function StudentScheduleEventDetails({
  event,
  variant,
}: StudentScheduleEventDetailsProps) {
  return (
    <div
      className={cn(
        "flex min-h-full flex-col text-left",
        variant === "inline" ? "gap-1 p-2" : "gap-2 p-3"
      )}
    >
      {variant === "inline" ? (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-[11px] font-semibold leading-tight wrap-break-word whitespace-normal text-foreground">
              {event.subjectName}
            </div>
            <div className="shrink-0 text-[10px] font-medium leading-tight text-muted-foreground">
              {event.timeLabel}
            </div>
          </div>

          <div className="text-[9px] leading-tight wrap-break-word whitespace-normal text-muted-foreground">
            {event.teacherName} / {event.roomName}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <div className="text-sm font-semibold leading-tight wrap-break-word whitespace-normal text-foreground">
              {event.subjectName}
            </div>
            <div className="text-xs font-medium leading-tight text-muted-foreground">
              {event.timeLabel}
            </div>
          </div>

          <div className="space-y-1 text-xs leading-tight text-muted-foreground">
            <div className="wrap-break-word whitespace-normal">{event.teacherName}</div>
            <div className="wrap-break-word whitespace-normal">{event.roomName}</div>
          </div>
        </>
      )}
    </div>
  );
}

function getCompactPreviewTier(availableHeight: number): CompactPreviewTier {
  if (availableHeight < 34) {
    return "xs";
  }

  if (availableHeight < 64) {
    return "sm";
  }

  return "lg";
}

function getCompactPreviewPreset(availableHeight: number): CompactPreviewPreset {
  return COMPACT_PREVIEW_PRESETS[getCompactPreviewTier(availableHeight)];
}
