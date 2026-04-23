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
import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
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
  formatTimeRange,
  getTeacherOverrideEntriesForWeek,
} from "../_lib/utils";

type AvailabilityEditorProps = {
  teacher: AvailabilityTeacher;
  weekStart: Date;
  isMutating: boolean;
  onOpenTemplateDialog: (entry?: AvailabilityTemplateEntry | null) => void;
  onDeleteTemplateEntry: (entry: AvailabilityTemplateEntry) => void;
  onOpenOverrideDialog: (entry?: AvailabilityOverrideEntry | null) => void;
  onDeleteOverride: (entry: AvailabilityOverrideEntry) => void;
};

export function AvailabilityEditor({
  teacher,
  weekStart,
  isMutating,
  onOpenTemplateDialog,
  onDeleteTemplateEntry,
  onOpenOverrideDialog,
  onDeleteOverride,
}: AvailabilityEditorProps) {
  const weekOverrides = getTeacherOverrideEntriesForWeek(teacher, weekStart);
  const dayLabelsByDayOfWeek = new Map(
    DAY_CONFIG.map((day) => [day.dayOfWeek, day.label]),
  );
  const templateGroups = (["PREFERRED", "AVAILABLE", "UNAVAILABLE"] as const).map((type) => ({
    type,
    label: AVAILABILITY_TYPE_LABELS[type],
    entries: teacher.templateEntries
      .filter((entry) => entry.type === type)
      .slice()
      .sort((left, right) => left.dayOfWeek !== right.dayOfWeek
          ? left.dayOfWeek - right.dayOfWeek
          : left.startTime - right.startTime
      ),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Базовый шаблон</CardTitle>
          <CardDescription>
            Изменения действуют для всех будущих недель и автоматически нормализуются по
            пересечениям.
          </CardDescription>
          <CardAction>
            <Button
              variant="default"
              size="sm"
              disabled={isMutating}
              onClick={() => onOpenTemplateDialog()}
            >
              <CalendarDays data-icon="inline-start" />
              Добавить слот
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {teacher.templateEntries.length === 0 ? (
            <FilterableEmptyState
              hasFilters={false}
              empty={{
                icon: <CalendarDays />,
                title: "Базовый шаблон еще не задан",
                description: "Добавьте первый слот доступности, чтобы сформировать недельный шаблон преподавателя.",
                className: "min-h-80 py-8",
              }}
            />
          ) : (
            templateGroups.map((group) => (
              <div key={group.type} className="rounded-xl bg-background">
                <div className="border-b py-2">
                  <Badge variant={AVAILABILITY_TYPE_BADGE_VARIANTS[group.type]}>
                    {group.label}
                  </Badge>
                </div>

                <div className="flex flex-col gap-2 py-3">
                  {group.entries.length === 0 ? (
                    <div className="rounded-lg text-sm text-muted-foreground">
                      Для этого типа доступности интервалы еще не заданы.
                    </div>
                  ) : (
                    group.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg"
                      >
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-medium text-foreground">
                            {dayLabelsByDayOfWeek.get(entry.dayOfWeek)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatTimeRange(entry.startTime, entry.endTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => onOpenTemplateDialog(entry)}
                          >
                            <PencilLine data-icon="inline-start" />
                            Изменить
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isMutating}
                            onClick={() => void onDeleteTemplateEntry(entry)}
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
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Исключения</CardTitle>
          <CardDescription>
            Разовые изменения поверх шаблона.
          </CardDescription>
          <CardAction>
            <Button
              variant="default"
              size="sm"
              disabled={isMutating}
              onClick={() => onOpenOverrideDialog()}
            >
              <CalendarDays data-icon="inline-start" />
              Добавить исключение
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {teacher.overrides.length === 0 ? (
            <FilterableEmptyState
              hasFilters={false}
              empty={{
                icon: <CalendarDays />,
                title: "Исключений пока нет",
                description: "Добавляйте отгулы, больничные и временные окна доступности поверх базового шаблона.",
                className: "min-h-80 py-8",
              }}
            />
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
                .sort((left, right) => left.startTime.getTime() - right.startTime.getTime())
                .map((entry) => (
                  <div key={entry.id} className="rounded-xl bg-background py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
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
                            entry.startTime.getHours() * 60 + entry.startTime.getMinutes(),
                            entry.endTime.getHours() * 60 + entry.endTime.getMinutes(),
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isMutating}
                          onClick={() => onOpenOverrideDialog(entry)}
                        >
                          <PencilLine data-icon="inline-start" />
                          Изменить
                        </Button>
                        <Button
                          variant="destructive"
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
