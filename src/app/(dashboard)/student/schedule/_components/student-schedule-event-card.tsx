"use client";

import { useEffect, useRef, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { StudentScheduleEvent } from "../_lib/student-schedule-types";

interface StudentScheduleEventCardProps {
  event: StudentScheduleEvent;
}

type CompactTier = "xs" | "sm" | "md" | "lg";

const FIT_TOLERANCE_PX = 2;

export function StudentScheduleEventCard({ event }: StudentScheduleEventCardProps) {
  const [availableHeight, setAvailableHeight] = useState(0);
  const [fullDetailsHeight, setFullDetailsHeight] = useState(0);
  const visibleCardRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

  const titleLines = [
    event.subjectName,
    event.timeLabel,
    event.teacherName,
    event.roomName,
  ];
  const cardLabel = titleLines.join(", ");
  const fitsFully =
    fullDetailsHeight > 0 && fullDetailsHeight <= availableHeight + FIT_TOLERANCE_PX;
  const compactTier = getCompactTier(availableHeight);
  const compactTypographyClass = getCompactTypographyClass(compactTier);

  useEffect(() => {
    const updateMeasurements = () => {
      const nextAvailableHeight = Math.ceil(
        visibleCardRef.current?.getBoundingClientRect().height ?? 0
      );
      const nextFullDetailsHeight = Math.ceil(
        measureRef.current?.getBoundingClientRect().height ?? 0
      );

      setAvailableHeight((previousHeight) =>
        previousHeight === nextAvailableHeight ? previousHeight : nextAvailableHeight
      );
      setFullDetailsHeight((previousHeight) =>
        previousHeight === nextFullDetailsHeight ? previousHeight : nextFullDetailsHeight
      );
    };

    updateMeasurements();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateMeasurements();
    });

    if (visibleCardRef.current) {
      observer.observe(visibleCardRef.current);
    }

    if (measureRef.current) {
      observer.observe(measureRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [event.groupName, event.roomName, event.subjectName, event.teacherName, fitsFully]);

  const measurementContent = (
    <div ref={measureRef} aria-hidden={true} className="absolute inset-x-0 top-0 invisible pointer-events-none">
      <StudentScheduleEventDetails event={event} variant="inline" />
    </div>
  );

  if (fitsFully) {
    return (
      <div className="relative h-full">
        {measurementContent}
        <div
          ref={visibleCardRef}
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
    <div className="relative h-full">
      {measurementContent}
      <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger
            data-testid="student-schedule-card"
            data-card-mode="compact"
            data-font-tier={compactTier}
            data-time-label={event.timeLabel}
            aria-label={cardLabel}
            delay={0}
            className="block h-full w-full rounded-[inherit] bg-transparent p-0 text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <div ref={visibleCardRef} className="h-full">
              <StudentScheduleEventCompactPreview
                subjectName={event.subjectName}
                typographyClassName={compactTypographyClass}
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
  subjectName: string;
  typographyClassName: string;
}

function StudentScheduleEventCompactPreview({
  subjectName,
  typographyClassName,
}: StudentScheduleEventCompactPreviewProps) {
  return (
    <div className="flex h-full items-center px-2 py-1 text-left">
      <div
        className={cn(
          "line-clamp-2 w-full wrap-break-word font-semibold text-foreground",
          typographyClassName
        )}
      >
        {subjectName}
      </div>
    </div>
  );
}

interface StudentScheduleEventDetailsProps {
  event: StudentScheduleEvent,
  variant: "inline" | "overlay"
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

function getCompactTier(availableHeight: number): CompactTier {
  if (availableHeight < 34) {
    return "xs";
  }

  if (availableHeight < 48) {
    return "sm";
  }

  if (availableHeight < 64) {
    return "md";
  }

  return "lg";
}

function getCompactTypographyClass(tier: CompactTier) {
  switch (tier) {
    case "xs":
      return "text-[9px] leading-tight";
    case "sm":
      return "text-[10px] leading-tight";
    case "md":
      return "text-[11px] leading-tight";
    default:
      return "text-xs leading-tight";
  }
}
