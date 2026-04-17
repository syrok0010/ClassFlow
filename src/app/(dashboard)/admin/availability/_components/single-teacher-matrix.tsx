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
  formatTimeFromDateTime,
  getDayDateLabel,
  getTeacherDayTimeline,
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
          getTeacherDayTimeline(teacher, weekStart, day.dayOfWeek),
        ]),
      ),
    [teacher, weekStart],
  );
  const hoveredDay = hovered ? DAY_CONFIG.find((day) => day.dayOfWeek === hovered.dayOfWeek) ?? null : null;
  const hoveredTimeline = hoveredDay ? dayTimelines.get(hoveredDay.dayOfWeek) ?? null : null;
  const hoveredState =
    hovered && hoveredTimeline ? getTeacherMinuteState(hoveredTimeline, hovered.minute) : null;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{teacher.fullName}</CardTitle>
        <CardDescription>
          Детальный просмотр шаблона, исключений и фактических уроков за неделю.
        </CardDescription>
        <CardAction>
          <div className="flex flex-wrap justify-end gap-2">
            <Badge variant="default">Предпочтительно</Badge>
            <Badge variant="secondary">Доступно</Badge>
            <Badge variant="destructive">Недоступно</Badge>
            <Badge variant="outline">Урок</Badge>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <AvailabilityTimelineScale />

        {DAY_CONFIG.map((day) => {
          const dayTimeline = dayTimelines.get(day.dayOfWeek);

          if (!dayTimeline) {
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
                        {hoveredState.schedule ? (
                          <p className="text-sky-700">
                            Урок: {hoveredState.schedule.groupName} ·{" "}
                            {hoveredState.schedule.subjectName}
                          </p>
                        ) : null}
                        {hoveredState.schedule?.hasConflict ? (
                          <p className="text-destructive">
                            Конфликт: урок пересекается с недоступностью
                          </p>
                        ) : null}
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
                  {dayTimeline.availabilitySegments.map((segment) => (
                    <div
                      key={`${day.dayOfWeek}-${segment.startMinute}-${segment.endMinute}-${segment.type}-${segment.isOverride ? "override" : "template"}`}
                      className={`absolute inset-y-0 ${
                        segment.type === "PREFERRED"
                          ? "bg-emerald-500/35"
                          : segment.type === "AVAILABLE"
                            ? "bg-emerald-200/80"
                            : "bg-slate-300/70"
                      }`}
                      style={{
                        left: `${minuteToTimelinePercent(segment.startMinute)}%`,
                        width: `${durationToTimelinePercent(segment.endMinute - segment.startMinute)}%`,
                        backgroundImage: segment.isOverride
                          ? "repeating-linear-gradient(-45deg, rgba(15,23,42,0.14), rgba(15,23,42,0.14) 4px, transparent 4px, transparent 8px)"
                          : undefined,
                      }}
                      title={`${minutesToTime(segment.startMinute)} - ${minutesToTime(segment.endMinute)} · ${segment.isOverride ? "Исключение" : "Шаблон"} · ${AVAILABILITY_TYPE_LABELS[segment.type]}`}
                    />
                  ))}
                </div>

                <div className="pointer-events-none absolute inset-1">
                  {dayTimeline.scheduleEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`absolute top-3 bottom-3 rounded-lg bg-sky-600/90 px-2 py-1 text-[11px] font-medium text-white shadow-sm ${
                        entry.hasConflict ? "ring-2 ring-destructive" : ""
                      }`}
                      style={{
                        left: `${minuteToTimelinePercent(entry.startMinute)}%`,
                        width: `${durationToTimelinePercent(entry.endMinute - entry.startMinute)}%`,
                      }}
                      title={`${formatTimeFromDateTime(entry.startTime)} - ${formatTimeFromDateTime(entry.endTime)} · ${entry.groupName} · ${entry.subjectName}`}
                    >
                      <div className="truncate">{entry.groupName}</div>
                      <div className="truncate text-sky-50/90">{entry.subjectName}</div>
                    </div>
                  ))}
                </div>
              </AvailabilityTimelineCanvas>
            </AvailabilityTimelineRow>
          );
        })}

        {teacher.scheduleEntries.length === 0 ? (
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            На выбранной неделе у преподавателя нет фактических занятий, поэтому сетка показывает
            только availability и override.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
