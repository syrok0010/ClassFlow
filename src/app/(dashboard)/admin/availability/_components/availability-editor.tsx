"use client";

import { CalendarDays, PencilLine, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
  AvailabilityTeacher,
  AvailabilityTemplateEntry,
} from "../_lib/types";
import {
  AVAILABILITY_TYPE_BADGE_VARIANTS,
  AVAILABILITY_TYPE_LABELS,
  DAY_CONFIG,
  formatDateRange,
  formatTimeFromDateTime,
  formatTimeRange,
  getTeacherDayEntries,
  getTeacherOverrideEntriesForWeek,
} from "../_lib/utils";

type AvailabilityEditorProps = {
  teacher: AvailabilityTeacher;
  weekStart: string;
  isMutating: boolean;
  onAddTemplateEntry: (dayOfWeek: number) => void;
  onEditTemplateEntry: (entry: AvailabilityTemplateEntry) => void;
  onDeleteTemplateEntry: (entry: AvailabilityTemplateEntry) => void;
  onAddOverride: () => void;
  onEditOverride: (entry: AvailabilityOverrideEntry) => void;
  onDeleteOverride: (entry: AvailabilityOverrideEntry) => void;
};

export function AvailabilityEditor({
  teacher,
  weekStart,
  isMutating,
  onAddTemplateEntry,
  onEditTemplateEntry,
  onDeleteTemplateEntry,
  onAddOverride,
  onEditOverride,
  onDeleteOverride,
}: AvailabilityEditorProps) {
  const weekOverrides = getTeacherOverrideEntriesForWeek(teacher, weekStart);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Базовый шаблон</CardTitle>
          <CardDescription>
            Изменения действуют для всех будущих недель и автоматически нормализуются по
            пересечениям.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {DAY_CONFIG.map((day) => {
            const entries = getTeacherDayEntries(teacher, day.dayOfWeek);

            return (
              <div key={day.dayOfWeek} className="rounded-xl border bg-background">
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{day.label}</p>
                    <p className="text-xs text-muted-foreground">{day.shortLabel}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isMutating}
                    onClick={() => onAddTemplateEntry(day.dayOfWeek)}
                  >
                    <CalendarDays data-icon="inline-start" />
                    Добавить слот
                  </Button>
                </div>

                <div className="flex flex-col gap-2 px-4 py-3">
                  {entries.length === 0 ? (
                    <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
                      Для этого дня шаблон еще не задан.
                    </div>
                  ) : (
                    entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <Badge variant={AVAILABILITY_TYPE_BADGE_VARIANTS[entry.type]}>
                            {AVAILABILITY_TYPE_LABELS[entry.type]}
                          </Badge>
                          <span className="font-medium text-foreground">
                            {formatTimeRange(entry.startTime, entry.endTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => onEditTemplateEntry(entry)}
                          >
                            <PencilLine data-icon="inline-start" />
                            Изменить
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => {
                              void onDeleteTemplateEntry(entry);
                            }}
                          >
                            <Trash2 data-icon="inline-start" />
                            Удалить
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Исключения</CardTitle>
          <CardDescription>
            Разовые изменения поверх шаблона. В списке сначала показываются исключения текущей
            недели.
          </CardDescription>
          <CardAction>
            <Button variant="outline" size="sm" disabled={isMutating} onClick={onAddOverride}>
              <CalendarDays data-icon="inline-start" />
              Добавить исключение
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {teacher.overrides.length === 0 ? (
            <Empty className="min-h-[320px] py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDays />
                </EmptyMedia>
                <EmptyTitle>Исключений пока нет</EmptyTitle>
                <EmptyDescription>
                  Добавляйте отгулы, больничные и временные окна доступности поверх базового
                  шаблона.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {weekOverrides.length > 0 ? (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  На текущей неделе активно {weekOverrides.length}{" "}
                  {weekOverrides.length === 1 ? "исключение" : "исключения"}.
                </div>
              ) : null}

              {teacher.overrides
                .slice()
                .sort((left, right) => left.startTime.localeCompare(right.startTime))
                .map((entry) => (
                  <div key={entry.id} className="rounded-xl border bg-background p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={AVAILABILITY_TYPE_BADGE_VARIANTS[entry.type]}>
                            {AVAILABILITY_TYPE_LABELS[entry.type]}
                          </Badge>
                          {weekOverrides.some((override) => override.id === entry.id) ? (
                            <Badge variant="outline">Текущая неделя</Badge>
                          ) : null}
                        </div>
                        <p className="font-medium text-foreground">
                          {formatDateRange(entry.startTime, entry.endTime)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatTimeRange(
                            formatTimeFromDateTime(entry.startTime),
                            formatTimeFromDateTime(entry.endTime),
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isMutating}
                          onClick={() => onEditOverride(entry)}
                        >
                          <PencilLine data-icon="inline-start" />
                          Изменить
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isMutating}
                          onClick={() => onDeleteOverride(entry)}
                        >
                          <Trash2 data-icon="inline-start" />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

