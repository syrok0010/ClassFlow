import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  SLOT_COUNT,
  minuteToTimelinePercent,
} from "../_lib/utils";
import { SLOT_LABELS } from "./availability-view-helpers";

type AvailabilityTimelineRowProps = {
  dayLabel: string;
  dateLabel: string;
  children: ReactNode;
};

type AvailabilityTimelineCanvasProps = {
  hoveredMinute: number | null;
  hoverContent?: ReactNode;
  onHoverMinuteChange: (minute: number | null) => void;
  children: ReactNode;
  className?: string;
};

export function AvailabilityTimelineScale() {
  return (
    <div className="grid grid-cols-[120px_repeat(20,minmax(0,1fr))] gap-1 text-xs text-muted-foreground">
      <div />
      {SLOT_LABELS.map((label) => (
        <div key={label} className="text-center">
          {label}
        </div>
      ))}
    </div>
  );
}

export function AvailabilityTimelineRow({
  dayLabel,
  dateLabel,
  children,
}: AvailabilityTimelineRowProps) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
      <div className="flex flex-col justify-center rounded-lg border bg-muted/40 px-3 py-2">
        <span className="font-medium text-foreground">{dayLabel}</span>
        <span className="text-xs text-muted-foreground">{dateLabel}</span>
      </div>
      {children}
    </div>
  );
}

export function AvailabilityTimelineCanvas({
  hoveredMinute,
  hoverContent,
  onHoverMinuteChange,
  children,
  className,
}: AvailabilityTimelineCanvasProps) {
  return (
    <Tooltip open={hoveredMinute !== null && Boolean(hoverContent)} trackCursorAxis="both">
      <TooltipTrigger
        render={
          <div
            className={cn("relative h-28", className)}
            onMouseLeave={() => onHoverMinuteChange(null)}
            onMouseMove={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const offsetX = Math.min(Math.max(0, event.clientX - rect.left), rect.width);
              const minuteOffset = Math.min(
                DAY_END_MINUTES - DAY_START_MINUTES - 1,
                Math.max(
                  0,
                  Math.floor((offsetX / rect.width) * (DAY_END_MINUTES - DAY_START_MINUTES)),
                ),
              );

              onHoverMinuteChange(DAY_START_MINUTES + minuteOffset);
            }}
          />
        }
      >
        <div className="relative h-full overflow-hidden rounded-lg border bg-background">
          <TimelineReferenceGrid />
          {children}
          {hoveredMinute !== null ? (
            <div
              className="pointer-events-none absolute inset-y-0 w-px bg-primary/50"
              style={{ left: `${minuteToTimelinePercent(hoveredMinute)}%` }}
            />
          ) : null}
        </div>
      </TooltipTrigger>
      {hoverContent ? (
        <TooltipContent
          sideOffset={16}
          showArrow={false}
          className="w-80 max-w-sm items-start rounded-lg border bg-background/95 p-3 text-sm text-foreground shadow-lg ring-1 ring-border backdrop-blur"
        >
          {hoverContent}
        </TooltipContent>
      ) : null}
    </Tooltip>
  );
}

function TimelineReferenceGrid() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: SLOT_COUNT - 1 }).map((_, index) => {
        const minute = DAY_START_MINUTES + (index + 1) * 30;

        return (
          <div
            key={minute}
            className="absolute inset-y-0 w-px bg-border/80"
            style={{ left: `${minuteToTimelinePercent(minute)}%` }}
          />
        );
      })}
    </div>
  );
}
