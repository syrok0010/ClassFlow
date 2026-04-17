"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AvailabilityTeacher } from "../_lib/types";
import {
  DAY_CONFIG,
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  buildMinuteBreakdown,
  durationToTimelinePercent,
  getDayDateLabel,
  getTeacherDayTimeline,
  minuteToTimelinePercent,
  minutesToTime,
  type TeacherTimelineRef,
} from "../_lib/utils";
import {
  AvailabilityTimelineCanvas,
  AvailabilityTimelineRow,
  AvailabilityTimelineScale,
} from "./availability-timeline-shared";

type MultiTeacherMatrixProps = {
  teachers: AvailabilityTeacher[];
  weekStart: string;
};

type MinuteCounts = {
  free: number;
  busy: number;
  unavailable: number;
};

type CountSegment = MinuteCounts & {
  startMinute: number;
  endMinute: number;
};

type DayAggregation = {
  teacherTimelineRefs: TeacherTimelineRef[];
  segments: CountSegment[];
};

export function MultiTeacherMatrix({
  teachers,
  weekStart,
}: MultiTeacherMatrixProps) {
  const [hovered, setHovered] = useState<{ dayOfWeek: number; minute: number } | null>(null);
  const maxStackHeight = teachers.length;
  const dayAggregations = useMemo(
    () =>
      new Map(
        DAY_CONFIG.map((day) => {
          const teacherTimelineRefs: TeacherTimelineRef[] = teachers.map((teacher) => ({
            teacher,
            timeline: getTeacherDayTimeline(teacher, weekStart, day.dayOfWeek),
          }));
          const minuteCounts = Array.from(
            { length: DAY_END_MINUTES - DAY_START_MINUTES },
            (_, minuteOffset) => {
              const breakdown = buildMinuteBreakdown(
                teacherTimelineRefs,
                DAY_START_MINUTES + minuteOffset,
              );

              return {
                free: breakdown.free.length,
                busy: breakdown.busy.length,
                unavailable: breakdown.unavailable.length,
              };
            },
          );

          return [
            day.dayOfWeek,
            {
              teacherTimelineRefs,
              segments: buildCountSegments(minuteCounts),
            } satisfies DayAggregation,
          ] as const;
        }),
      ),
    [teachers, weekStart],
  );
  const hoveredDay = hovered ? DAY_CONFIG.find((day) => day.dayOfWeek === hovered.dayOfWeek) ?? null : null;
  const hoveredAggregation = hoveredDay ? dayAggregations.get(hoveredDay.dayOfWeek) ?? null : null;
  const hoveredBreakdown =
    hovered && hoveredAggregation
      ? buildMinuteBreakdown(hoveredAggregation.teacherTimelineRefs, hovered.minute)
      : null;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Сводка пересечений</CardTitle>
        <CardDescription>
          Чем выше стек, тем больше преподавателей с явно заданным статусом в этот момент.
        </CardDescription>
        <CardAction>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant="secondary">Свободны</Badge>
            <Badge variant="outline">На уроках</Badge>
            <Badge variant="destructive">Недоступны</Badge>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <AvailabilityTimelineScale />

        {DAY_CONFIG.map((day) => {
          const dayAggregation = dayAggregations.get(day.dayOfWeek);

          if (!dayAggregation) {
            return null;
          }

          return (
            <AvailabilityTimelineRow
              key={day.dayOfWeek}
              dayLabel={day.label}
              dateLabel={getDayDateLabel(weekStart, day.dayOfWeek)}
            >
              <AvailabilityTimelineCanvas
                hoveredMinute={hovered?.dayOfWeek === day.dayOfWeek ? hovered.minute : null}
                hoverContent={
                  hovered?.dayOfWeek === day.dayOfWeek && hoveredBreakdown && hoveredDay ? (
                    <div className="flex flex-col gap-2">
                      <div className="font-medium text-foreground">
                        {hoveredDay.label}, {getDayDateLabel(weekStart, hoveredDay.dayOfWeek)} ·{" "}
                        {minutesToTime(hovered.minute)}
                      </div>
                      <div className="flex flex-col gap-2">
                        <TooltipGroup
                          title={`Свободны (${hoveredBreakdown.free.length})`}
                          tone="text-emerald-700"
                          items={hoveredBreakdown.free.map((entry) => entry.teacherName)}
                        />
                        <TooltipGroup
                          title={`На уроках (${hoveredBreakdown.busy.length})`}
                          tone="text-sky-700"
                          items={hoveredBreakdown.busy.map((entry) =>
                            entry.lessonLabel
                              ? `${entry.teacherName} (${entry.lessonLabel})`
                              : entry.teacherName,
                          )}
                        />
                        <TooltipGroup
                          title={`Недоступны (${hoveredBreakdown.unavailable.length})`}
                          tone="text-destructive"
                          items={hoveredBreakdown.unavailable.map((entry) => entry.teacherName)}
                        />
                        <TooltipGroup
                          title={`Не отмечены (${hoveredBreakdown.unmarked.length})`}
                          tone="text-muted-foreground"
                          items={hoveredBreakdown.unmarked.map((entry) => entry.teacherName)}
                        />
                      </div>
                    </div>
                  ) : undefined
                }
                onHoverMinuteChange={(minute) => {
                  setHovered({
                    dayOfWeek: day.dayOfWeek,
                    minute,
                  });
                }}
                onHoverEnd={() => setHovered(null)}
              >
                <div className="absolute inset-0">
                  {dayAggregation.segments.map((segment) => {
                    const freeHeight = (segment.free / maxStackHeight) * 100;
                    const busyHeight = (segment.busy / maxStackHeight) * 100;
                    const unavailableHeight = (segment.unavailable / maxStackHeight) * 100;
                    const explicitCount = segment.free + segment.busy + segment.unavailable;

                    if (explicitCount === 0) {
                      return null;
                    }

                    return (
                      <div
                        key={`${day.dayOfWeek}-${segment.startMinute}-${segment.endMinute}`}
                        className="absolute inset-y-0"
                        style={{
                          left: `${minuteToTimelinePercent(segment.startMinute)}%`,
                          width: `${durationToTimelinePercent(segment.endMinute - segment.startMinute)}%`,
                        }}
                      >
                        {segment.free > 0 ? (
                          <div
                            className="absolute inset-x-0 bottom-0 rounded-b-sm bg-emerald-400/90"
                            style={{ height: `${freeHeight}%` }}
                          />
                        ) : null}
                        {segment.busy > 0 ? (
                          <div
                            className="absolute inset-x-0 bg-sky-500/80"
                            style={{
                              bottom: `${freeHeight}%`,
                              height: `${busyHeight}%`,
                            }}
                          />
                        ) : null}
                        {segment.unavailable > 0 ? (
                          <div
                            className="absolute inset-x-0 rounded-t-sm bg-destructive/70"
                            style={{
                              bottom: `${freeHeight + busyHeight}%`,
                              height: `${unavailableHeight}%`,
                            }}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </AvailabilityTimelineCanvas>
            </AvailabilityTimelineRow>
          );
        })}
      </CardContent>
    </Card>
  );
}

function buildCountSegments(minuteCounts: MinuteCounts[]): CountSegment[] {
  if (minuteCounts.length === 0) {
    return [];
  }

  const segments: CountSegment[] = [];
  let currentStartMinute = DAY_START_MINUTES;
  let currentCounts = minuteCounts[0];

  for (let minuteOffset = 1; minuteOffset < minuteCounts.length; minuteOffset += 1) {
    const nextCounts = minuteCounts[minuteOffset];

    if (
      currentCounts.free === nextCounts.free
      && currentCounts.busy === nextCounts.busy
      && currentCounts.unavailable === nextCounts.unavailable
    ) {
      continue;
    }

    segments.push({
      startMinute: currentStartMinute,
      endMinute: DAY_START_MINUTES + minuteOffset,
      ...currentCounts,
    });
    currentStartMinute = DAY_START_MINUTES + minuteOffset;
    currentCounts = nextCounts;
  }

  segments.push({
    startMinute: currentStartMinute,
    endMinute: DAY_END_MINUTES,
    ...currentCounts,
  });

  return segments;
}

function TooltipGroup({
  title,
  tone,
  items,
}: {
  title: string;
  tone: string;
  items: string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className={`font-medium ${tone}`}>{title}</p>
      {items.length > 0 ? (
        <p className="text-muted-foreground">{items.join(", ")}</p>
      ) : (
        <p className="text-muted-foreground">Нет</p>
      )}
    </div>
  );
}
