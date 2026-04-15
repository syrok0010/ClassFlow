"use client";

import { useState } from "react";
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
  DAY_START_MINUTES,
  SLOT_COUNT,
  SLOT_MINUTES,
  buildSlotBreakdown,
  getDayDateLabel,
  minutesToTime,
} from "../_lib/utils";
import { SLOT_LABELS } from "./availability-view-helpers";

type MultiTeacherMatrixProps = {
  teachers: AvailabilityTeacher[];
  weekStart: string;
};

export function MultiTeacherMatrix({
  teachers,
  weekStart,
}: MultiTeacherMatrixProps) {
  const [hovered, setHovered] = useState<{ dayOfWeek: number; slotIndex: number } | null>(null);

  const maxStackHeight = teachers.length;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Сводка пересечений</CardTitle>
        <CardDescription>
          Чем выше стек, тем больше преподавателей с явно заданным статусом в этот слот.
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
        <div className="grid grid-cols-[120px_repeat(20,minmax(0,1fr))] gap-1 text-xs text-muted-foreground">
          <div />
          {SLOT_LABELS.map((label) => (
            <div key={label} className="text-center">
              {label}
            </div>
          ))}
        </div>

        {DAY_CONFIG.map((day) => {
          const activeHover = hovered?.dayOfWeek === day.dayOfWeek ? hovered.slotIndex : null;

          return (
            <div key={day.dayOfWeek} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
              <div className="flex flex-col justify-center rounded-lg border bg-muted/40 px-3 py-2">
                <span className="font-medium text-foreground">{day.label}</span>
                <span className="text-xs text-muted-foreground">
                  {getDayDateLabel(weekStart, day.dayOfWeek)}
                </span>
              </div>

              <div className="relative rounded-lg border bg-background p-2">
                {activeHover !== null ? (
                  <div
                    className="pointer-events-none absolute top-2 bottom-2 z-10 w-px bg-primary/40"
                    style={{
                      left: `calc(${((activeHover + 0.5) / SLOT_COUNT) * 100}% + 0.25rem)`,
                    }}
                  />
                ) : null}

                <div
                  className="grid h-28 grid-cols-20 gap-1"
                  onMouseLeave={() => setHovered(null)}
                >
                  {Array.from({ length: SLOT_COUNT }).map((_, slotIndex) => {
                    const breakdown = buildSlotBreakdown(teachers, weekStart, day.dayOfWeek, slotIndex);
                    const explicitCount =
                      breakdown.free.length + breakdown.busy.length + breakdown.unavailable.length;

                    return (
                      <button
                        key={`${day.dayOfWeek}-${slotIndex}`}
                        type="button"
                        onMouseEnter={() => setHovered({ dayOfWeek: day.dayOfWeek, slotIndex })}
                        className="group relative flex items-end rounded-md bg-muted/50 px-0.5"
                      >
                        <div className="flex h-full w-full flex-col justify-end gap-px">
                          <div
                            className="rounded-t-sm bg-destructive/70"
                            style={{
                              height: `${(breakdown.unavailable.length / maxStackHeight) * 100}%`,
                            }}
                          />
                          <div
                            className="bg-sky-500/80"
                            style={{
                              height: `${(breakdown.busy.length / maxStackHeight) * 100}%`,
                            }}
                          />
                          <div
                            className="rounded-b-sm bg-emerald-400/90"
                            style={{
                              height: `${(breakdown.free.length / maxStackHeight) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="sr-only">
                          {minutesToTime(DAY_START_MINUTES + slotIndex * SLOT_MINUTES)}: {explicitCount}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {activeHover !== null ? (
                  <MultiTeacherTooltip
                    breakdown={buildSlotBreakdown(teachers, weekStart, day.dayOfWeek, activeHover)}
                    label={minutesToTime(DAY_START_MINUTES + activeHover * SLOT_MINUTES)}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function MultiTeacherTooltip({
  breakdown,
  label,
}: {
  breakdown: ReturnType<typeof buildSlotBreakdown>;
  label: string;
}) {
  return (
    <div className="absolute right-2 bottom-2 z-20 w-[20rem] rounded-xl border bg-background/95 p-3 text-sm shadow-lg backdrop-blur">
      <div className="mb-2 font-medium text-foreground">{label}</div>
      <div className="flex flex-col gap-2">
        <TooltipGroup
          title={`Свободны (${breakdown.free.length})`}
          tone="text-emerald-700"
          items={breakdown.free.map((entry) => entry.teacherName)}
        />
        <TooltipGroup
          title={`На уроках (${breakdown.busy.length})`}
          tone="text-sky-700"
          items={breakdown.busy.map((entry) =>
            entry.lessonLabel ? `${entry.teacherName} (${entry.lessonLabel})` : entry.teacherName,
          )}
        />
        <TooltipGroup
          title={`Недоступны (${breakdown.unavailable.length})`}
          tone="text-destructive"
          items={breakdown.unavailable.map((entry) => entry.teacherName)}
        />
      </div>
    </div>
  );
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
