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
} from "./availability-timeline-shared";

type SingleTeacherMatrixProps = {
  teacher: AvailabilityTeacher;
  weekStart: string;
};

export function SingleTeacherMatrix({
  teacher,
  weekStart,
}: SingleTeacherMatrixProps) {
  const [hovered, setHovered] = useState<{ dayOfWeek: number; minute: number } | null>(null);
  const dayTimelines = useMemo(
    () =>
      new Map(
        DAY_CONFIG.map((day) => [
          day.dayOfWeek,
          getTeacherDayAvailabilitySegments(teacher, weekStart, day.dayOfWeek),
        ]),
      ),
    [teacher, weekStart],
  );
  const hoveredDay = hovered ? DAY_CONFIG.find((day) => day.dayOfWeek === hovered.dayOfWeek) ?? null : null;
  const hoveredSegments = hoveredDay ? dayTimelines.get(hoveredDay.dayOfWeek) ?? null : null;
  const hoveredState =
    hovered && hoveredSegments ? getTeacherMinuteState(hoveredSegments, hovered.minute) : null;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{teacher.fullName}</CardTitle>
        <CardDescription>
          Детальный просмотр базового шаблона и исключений на выбранной неделе.
        </CardDescription>
        <CardAction>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant="default">Предпочтительно</Badge>
            <Badge variant="secondary">Доступно</Badge>
            <Badge variant="destructive">Недоступно</Badge>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <AvailabilityTimelineScale />

        {DAY_CONFIG.map((day) => {
          const daySegments = dayTimelines.get(day.dayOfWeek);

          if (!daySegments) {
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
                  hovered?.dayOfWeek === day.dayOfWeek && hoveredState && hoveredDay ? (
                    <div className="flex flex-col gap-2">
                      <p className="font-medium text-foreground">
                        {hoveredDay.label}, {getDayDateLabel(weekStart, hoveredDay.dayOfWeek)} ·{" "}
                        {minutesToTime(hovered.minute)}
                      </p>
                      <div className="flex flex-col gap-1 text-muted-foreground">
                        <p>
                          {hoveredState.finalAvailability
                            ? `${hoveredState.isOverride ? "Исключение" : "Шаблон"}: ${AVAILABILITY_TYPE_LABELS[hoveredState.finalAvailability]}`
                            : "Шаблон не задан"}
                        </p>
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
                  {daySegments.map((segment) => (
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
          );
        })}
      </CardContent>
    </Card>
  );
}
