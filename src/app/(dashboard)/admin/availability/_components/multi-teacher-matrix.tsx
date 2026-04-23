"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AvailabilityTeacher } from "../_lib/types";
import {
  buildAvailabilityCountSegments,
  DAY_CONFIG,
  buildMinuteBreakdown,
  durationToTimelinePercent,
  getDayDateLabel,
  getTeacherDayAvailabilitySegments,
  minuteToTimelinePercent,
  minutesToTime,
  type AvailabilityCountSegment,
  type TeacherAvailabilityRef,
} from "../_lib/utils";
import {
  AvailabilityTimelineCanvas,
  AvailabilityTimelineRow,
  AvailabilityTimelineScale,
} from "./availability-timeline-shared";
import { MultiTeacherTooltipContent } from "./multi-teacher-tooltip-content";

type MultiTeacherMatrixProps = {
  teachers: AvailabilityTeacher[];
  weekStart: Date;
};

type DayAggregation = {
  dayOfWeek: number;
  dayLabel: string;
  dateLabel: string;
  teacherAvailabilityRefs: TeacherAvailabilityRef[];
  countSegments: AvailabilityCountSegment[];
};

export function MultiTeacherMatrix({
  teachers,
  weekStart,
}: MultiTeacherMatrixProps) {
  const [hovered, setHovered] = useState<{ dayOfWeek: number; minute: number } | null>(null);
  const maxStackHeight = teachers.length;
  const daysByDayOfWeek = useMemo(
    () =>
      new Map(
        DAY_CONFIG.map((day) => {
          const teacherAvailabilityRefs: TeacherAvailabilityRef[] = teachers.map((teacher) => ({
            teacher,
            segments: getTeacherDayAvailabilitySegments(teacher, weekStart, day.dayOfWeek),
          }));

          return [
            day.dayOfWeek,
            {
              dayOfWeek: day.dayOfWeek,
              dayLabel: day.label,
              dateLabel: getDayDateLabel(weekStart, day.dayOfWeek),
              teacherAvailabilityRefs,
              countSegments: buildAvailabilityCountSegments(teacherAvailabilityRefs),
            } satisfies DayAggregation,
          ] as const;
        }),
      ),
    [teachers, weekStart],
  );
  const hoveredDay = hovered ? daysByDayOfWeek.get(hovered.dayOfWeek) ?? null : null;
  const hoveredBreakdown = hovered && hoveredDay
    ? buildMinuteBreakdown(hoveredDay.teacherAvailabilityRefs, hovered.minute)
    : null;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Сводка пересечений</CardTitle>
        <CardDescription>
          Чем выше стек, тем больше преподавателей с явно заданным статусом в этот момент.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <AvailabilityTimelineScale />

        {Array.from(daysByDayOfWeek.values()).map((day) => (
          <AvailabilityTimelineRow
            key={day.dayOfWeek}
            dayLabel={day.dayLabel}
            dateLabel={day.dateLabel}
          >
            <AvailabilityTimelineCanvas
              hoveredMinute={hovered?.dayOfWeek === day.dayOfWeek ? hovered.minute : null}
              hoverContent={
                hovered?.dayOfWeek === day.dayOfWeek && hoveredBreakdown && hoveredDay ? (
                  <MultiTeacherTooltipContent
                    dayLabel={hoveredDay.dayLabel}
                    dateLabel={hoveredDay.dateLabel}
                    minuteLabel={minutesToTime(hovered.minute)}
                    breakdown={hoveredBreakdown}
                  />
                ) : undefined
              }
              onHoverMinuteChange={(minute) => {
                setHovered(
                  minute === null
                    ? null
                    : {
                        dayOfWeek: day.dayOfWeek,
                        minute,
                      },
                );
              }}
            >
              <div className="absolute inset-0">
                {day.countSegments.map((segment) => {
                  const availableHeight = (segment.available / maxStackHeight) * 100;
                  const unavailableHeight = (segment.unavailable / maxStackHeight) * 100;
                  const explicitCount = segment.available + segment.unavailable;

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
                      {segment.available > 0 ? (
                        <div
                          className="absolute inset-x-0 bottom-0 border-gray-700/20 border bg-emerald-400/90"
                          style={{ height: `${availableHeight}%` }}
                        />
                      ) : null}
                      {segment.unavailable > 0 ? (
                        <div
                          className="absolute inset-x-0 border-gray-700/20 bg-destructive/70"
                          style={{
                            bottom: `${availableHeight}%`,
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
        ))}
      </CardContent>
    </Card>
  );
}
