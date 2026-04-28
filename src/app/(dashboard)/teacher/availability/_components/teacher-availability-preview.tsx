import { useMemo, useState } from "react";
import { addDays } from "date-fns";
import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type {
  AvailabilityOverrideEntry,
  AvailabilityTemplateEntry,
  AvailabilityTeacher,
} from "@/features/availability/lib/types";
import {
  AvailabilityTimelineCanvas,
  AvailabilityTimelineRow,
  AvailabilityTimelineScale,
} from "@/features/availability/components/availability-timeline-shared";
import {
  AVAILABILITY_TYPE_LABELS,
  DAY_CONFIG,
  durationToTimelinePercent,
  getDayDateLabel,
  getTeacherDayAvailabilitySegments,
  getTeacherMinuteState,
  minuteToTimelinePercent,
  minutesToTime,
} from "@/features/availability/lib/utils";

type TeacherAvailabilityPreviewProps = {
  teacher: AvailabilityTeacher;
  weekStart: Date;
  selectedOverrideId: string | null;
  onOpenTemplateEditAction: (entry: AvailabilityTemplateEntry) => void;
  onOpenOverrideEditAction: (entry: AvailabilityOverrideEntry) => void;
};

export function TeacherAvailabilityPreview({
  teacher,
  weekStart,
  selectedOverrideId,
  onOpenTemplateEditAction,
  onOpenOverrideEditAction,
}: TeacherAvailabilityPreviewProps) {
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
            date: addDays(weekStart, day.dayOfWeek - 1),
            segments: getTeacherDayAvailabilitySegments(teacher, weekStart, day.dayOfWeek),
          },
        ]),
      ),
    [teacher, weekStart],
  );
  const hoveredDay = hovered ? daysByDayOfWeek.get(hovered.dayOfWeek) ?? null : null;
  const hoveredState =
    hovered && hoveredDay ? getTeacherMinuteState(hoveredDay.segments, hovered.minute) : null;
  const hasAnySegments = Array.from(daysByDayOfWeek.values()).some((day) => day.segments.length > 0);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Превью недели</CardTitle>
        <CardDescription>
          Сначала показывается базовый шаблон, затем исключения поверх него. Наведите на слот,
          чтобы быстро добавить доступность или override.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <AvailabilityTimelineScale />

        {hasAnySegments ? null : (
          <div className="rounded-xl border border-dashed bg-muted/30">
            <Empty className="min-h-52 py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Sparkles />
                </EmptyMedia>
                <EmptyTitle>На этой неделе у вас пока нет отмеченной доступности</EmptyTitle>
                <EmptyDescription>
                  Добавьте обычные интервалы шаблона или первое исключение прямо из сетки ниже.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}

        {Array.from(daysByDayOfWeek.values()).map((day) => (
          <AvailabilityTimelineRow
            key={day.dayOfWeek}
            dayLabel={day.dayLabel}
            dateLabel={day.dateLabel}
          >
            <AvailabilityTimelineCanvas
              hoveredMinute={hovered?.dayOfWeek === day.dayOfWeek ? hovered.minute : null}
              hoverContent={
                hovered?.dayOfWeek === day.dayOfWeek && hoveredState ? (
                  <PreviewTooltipContent
                    dayLabel={day.dayLabel}
                    dateLabel={day.dateLabel}
                    minuteLabel={minutesToTime(hovered.minute)}
                    state={hoveredState}
                  />
                ) : undefined
              }
              onHoverMinuteChange={(minute) => {
                setHovered(minute === null ? null : { dayOfWeek: day.dayOfWeek, minute });
              }}
            >
              <div className="absolute inset-0">
                {day.segments.map((segment) => {
                  const templateEntry = !segment.isOverride
                    ? teacher.templateEntries.find((entry) => entry.id === segment.sourceId) ?? null
                    : null;
                  const overrideEntry = segment.isOverride
                    ? teacher.overrides.find((entry) => entry.id === segment.sourceId) ?? null
                    : null;

                  return (
                    <button
                      key={`${day.dayOfWeek}-${segment.sourceId}-${segment.startMinute}-${segment.endMinute}-${segment.isOverride ? "override" : "template"}`}
                      type="button"
                      className={`absolute inset-y-0 border transition-shadow ${
                        segment.type === "PREFERRED"
                          ? "border-emerald-700/30 bg-emerald-500/95"
                          : segment.type === "AVAILABLE"
                            ? "border-emerald-600/20 bg-emerald-300/95"
                            : "border-destructive/30 bg-destructive/70"
                      } ${
                        segment.isOverride ? "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]" : ""
                      } ${
                        selectedOverrideId && segment.sourceId === selectedOverrideId
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : ""
                      }`}
                      style={{
                        left: `${minuteToTimelinePercent(segment.startMinute)}%`,
                        width: `${durationToTimelinePercent(segment.endMinute - segment.startMinute)}%`,
                        backgroundImage: segment.isOverride
                          ? "repeating-linear-gradient(-45deg, rgba(255,255,255,0.28), rgba(255,255,255,0.28) 4px, transparent 4px, transparent 8px)"
                          : undefined,
                      }}
                      title={`${minutesToTime(segment.startMinute)} - ${minutesToTime(segment.endMinute)} · ${segment.isOverride ? "Исключение" : "Шаблон"} · ${AVAILABILITY_TYPE_LABELS[segment.type]}`}
                      onClick={() => {
                        if (overrideEntry) {
                          onOpenOverrideEditAction(overrideEntry);
                          return;
                        }

                        if (templateEntry) {
                          onOpenTemplateEditAction(templateEntry);
                        }
                      }}
                    />
                  );
                })}
              </div>

              {hovered?.dayOfWeek === day.dayOfWeek ? (
                <div
                  className="absolute top-2 z-10 flex gap-2"
                  style={{
                    left: `${Math.min(78, Math.max(2, minuteToTimelinePercent(hovered.minute) - 10))}%`,
                  }}
                />
              ) : null}
            </AvailabilityTimelineCanvas>
          </AvailabilityTimelineRow>
        ))}
      </CardContent>
    </Card>
  );
}

function PreviewTooltipContent({
  dayLabel,
  dateLabel,
  minuteLabel,
  state,
}: {
  dayLabel: string;
  dateLabel: string;
  minuteLabel: string;
  state: ReturnType<typeof getTeacherMinuteState>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-foreground">
        {dayLabel}, {dateLabel} {minuteLabel}
      </p>
      <div className="flex flex-col gap-1 text-muted-foreground">
        <p>
          {state.availability
            ? `${AVAILABILITY_TYPE_LABELS[state.availability]}${
                state.isOverride ? " (Исключение)" : ""
              }`
            : "Шаблон не задан"}
        </p>
      </div>
    </div>
  );
}
