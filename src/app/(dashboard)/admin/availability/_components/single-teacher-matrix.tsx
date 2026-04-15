"use client";

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
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  SLOT_COUNT,
  SLOT_MINUTES,
  formatTimeFromDateTime,
  getDayDate,
  getDayDateLabel,
  getTeacherConflictSlots,
  getTeacherSlotState,
  timeToMinutes,
  toIsoDate,
} from "../_lib/utils";
import { SLOT_LABELS } from "./availability-view-helpers";

type SingleTeacherMatrixProps = {
  teacher: AvailabilityTeacher;
  weekStart: string;
};

export function SingleTeacherMatrix({
  teacher,
  weekStart,
}: SingleTeacherMatrixProps) {
  const conflictSlots = getTeacherConflictSlots(teacher, weekStart);

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
        <div className="grid grid-cols-[120px_repeat(20,minmax(0,1fr))] gap-1 text-xs text-muted-foreground">
          <div />
          {SLOT_LABELS.map((label) => (
            <div key={label} className="text-center">
              {label}
            </div>
          ))}
        </div>

        {DAY_CONFIG.map((day) => {
          const dayScheduleEntries = teacher.scheduleEntries.filter(
            (entry) =>
              toIsoDate(new Date(entry.startTime)) ===
              toIsoDate(getDayDate(weekStart, day.dayOfWeek)),
          );

          return (
            <div key={day.dayOfWeek} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
              <div className="flex flex-col justify-center rounded-lg border bg-muted/40 px-3 py-2">
                <span className="font-medium text-foreground">{day.label}</span>
                <span className="text-xs text-muted-foreground">
                  {getDayDateLabel(weekStart, day.dayOfWeek)}
                </span>
              </div>

              <div className="relative overflow-hidden rounded-lg border bg-background">
                <div className="grid h-16 grid-cols-20 gap-px bg-border">
                  {Array.from({ length: SLOT_COUNT }).map((_, slotIndex) => {
                    const slot = getTeacherSlotState(teacher, weekStart, day.dayOfWeek, slotIndex);
                    const finalAvailability = slot.finalAvailability;
                    const hasConflict = conflictSlots.has(`${day.dayOfWeek}:${slotIndex}`);

                    return (
                      <div
                        key={`${day.dayOfWeek}-${slotIndex}`}
                        className={`relative bg-background ${
                          finalAvailability === "PREFERRED"
                            ? "bg-emerald-500/35"
                            : finalAvailability === "AVAILABLE"
                              ? "bg-emerald-200/80"
                              : finalAvailability === "UNAVAILABLE"
                                ? "bg-slate-300/70"
                                : "bg-background"
                        } ${hasConflict ? "ring-2 ring-inset ring-destructive" : ""}`}
                        style={
                          slot.override
                            ? {
                                backgroundImage:
                                  "repeating-linear-gradient(-45deg, rgba(15,23,42,0.14), rgba(15,23,42,0.14) 4px, transparent 4px, transparent 8px)",
                              }
                            : undefined
                        }
                        title={
                          slot.schedule
                            ? `${formatTimeFromDateTime(slot.schedule.startTime)} - ${formatTimeFromDateTime(slot.schedule.endTime)} · ${slot.schedule.groupName} · ${slot.schedule.subjectName}`
                            : finalAvailability
                              ? AVAILABILITY_TYPE_LABELS[finalAvailability]
                              : "Не отмечено"
                        }
                      />
                    );
                  })}
                </div>

                <div className="pointer-events-none absolute inset-1">
                  {dayScheduleEntries.map((entry) => {
                    const startMinutes = timeToMinutes(formatTimeFromDateTime(entry.startTime));
                    const endMinutes = timeToMinutes(formatTimeFromDateTime(entry.endTime));
                    const clampedStart = Math.max(startMinutes, DAY_START_MINUTES);
                    const clampedEnd = Math.min(endMinutes, DAY_END_MINUTES);
                    const left =
                      ((clampedStart - DAY_START_MINUTES) / (DAY_END_MINUTES - DAY_START_MINUTES)) *
                      100;
                    const width =
                      ((clampedEnd - clampedStart) / (DAY_END_MINUTES - DAY_START_MINUTES)) * 100;

                    if (width <= 0) {
                      return null;
                    }

                    const hasConflict = Array.from(
                      {
                        length: Math.max(1, Math.ceil((clampedEnd - clampedStart) / SLOT_MINUTES)),
                      },
                      (_, index) =>
                        conflictSlots.has(
                          `${day.dayOfWeek}:${Math.floor((clampedStart - DAY_START_MINUTES) / SLOT_MINUTES) + index}`,
                        ),
                    ).some(Boolean);

                    return (
                      <div
                        key={entry.id}
                        className={`absolute top-1 bottom-1 rounded-md bg-sky-600/90 px-2 py-1 text-[11px] font-medium text-white shadow-sm ${
                          hasConflict ? "ring-2 ring-destructive" : ""
                        }`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${entry.groupName} · ${entry.subjectName}`}
                      >
                        <div className="truncate">{entry.groupName}</div>
                        <div className="truncate text-sky-50/90">{entry.subjectName}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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

