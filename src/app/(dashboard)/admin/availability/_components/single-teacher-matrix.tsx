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
  AVAILABILITY_TYPE_LABELS,
  DAY_CONFIG,
  durationToTimelinePercent,
  getDayDateLabel,
  getTeacherDayAvailabilitySegments,
  getTeacherMinuteState,
  minuteToTimelinePercent,
  minutesToTime,
} from "../_lib/utils";
import {
  AvailabilityTimelineCanvas,
  AvailabilityTimelineRow,
  AvailabilityTimelineScale,
} from "@/features/availability/components/availability-timeline-shared";
import { SingleTeacherTooltipContent } from "./single-teacher-tooltip-content";

type SingleTeacherMatrixProps = {
  teacher: AvailabilityTeacher;
  weekStart: Date;
};

export function SingleTeacherMatrix({
  teacher,
  weekStart,
}: SingleTeacherMatrixProps) {
  const [hovered, setHovered] = useState<{ dayOfWeek: number; minute: number } | null>(null);
  const daysByDayOfWeek = useMemo(
    () =>
      new Map(
        DAY_CONFIG.map((day) => [
          day.dayOfWeek,
          {
            dayOfWeek: day.dayOfWeek,
            dayLabel: day.label,
            dateLabel: getDayDateLabel(weekStart, day.dayOfWeek),
            segments: getTeacherDayAvailabilitySegments(teacher, weekStart, day.dayOfWeek),
          },
        ]),
      ),
    [teacher, weekStart],
  );
  const hoveredDay = hovered ? daysByDayOfWeek.get(hovered.dayOfWeek) ?? null : null;
  const hoveredState =
    hovered && hoveredDay ? getTeacherMinuteState(hoveredDay.segments, hovered.minute) : null;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{teacher.fullName}</CardTitle>
        <CardDescription>
          Детальный просмотр базового шаблона и исключений на выбранной неделе.
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
                hovered?.dayOfWeek === day.dayOfWeek && hoveredState && hoveredDay ? (
                  <SingleTeacherTooltipContent
                    dayLabel={hoveredDay.dayLabel}
                    dateLabel={hoveredDay.dateLabel}
                    minuteLabel={minutesToTime(hovered.minute)}
                    state={hoveredState}
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
                {day.segments.map((segment) => (
                  <div
                    key={`${day.dayOfWeek}-${segment.startMinute}-${segment.endMinute}-${segment.type}-${segment.isOverride ? "override" : "template"}`}
                    className={`absolute inset-y-0 ${
                      segment.type === "PREFERRED"
                        ? "bg-emerald-500/95"
                        : segment.type === "AVAILABLE"
                          ? "bg-emerald-400/90"
                          : "bg-destructive/70"
                    }`}
                    style={{
                      left: `${minuteToTimelinePercent(segment.startMinute)}%`,
                      width: `${durationToTimelinePercent(segment.endMinute - segment.startMinute)}%`,
                      backgroundImage: segment.isOverride
                        ? "repeating-linear-gradient(-45deg, rgba(255,255,255,0.28), rgba(255,255,255,0.28) 4px, transparent 4px, transparent 8px)"
                        : undefined,
                    }}
                    title={`${minutesToTime(segment.startMinute)} - ${minutesToTime(segment.endMinute)} · ${segment.isOverride ? "Исключение" : "Шаблон"} · ${AVAILABILITY_TYPE_LABELS[segment.type]}`}
                  />
                ))}
              </div>
            </AvailabilityTimelineCanvas>
          </AvailabilityTimelineRow>
        ))}
      </CardContent>
    </Card>
  );
}
