import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AvailabilityOverridesList } from "@/features/availability/components/availability-overrides-list";
import { AvailabilityTemplateList } from "@/features/availability/components/availability-template-list";
import type {
  AvailabilityOverrideEntry,
  AvailabilityTeacher,
  AvailabilityTemplateEntry,
} from "@/features/availability/lib/types";

export function AvailabilityEditor({
  teacher,
  weekStart,
  isMutating,
  onOpenTemplateDialog,
  onDeleteTemplateEntry,
  onOpenOverrideDialog,
  onDeleteOverride,
}: {
  teacher: AvailabilityTeacher;
  weekStart: Date;
  isMutating: boolean;
  onOpenTemplateDialog: (entry?: AvailabilityTemplateEntry | null) => void;
  onDeleteTemplateEntry: (entry: AvailabilityTemplateEntry) => void;
  onOpenOverrideDialog: (entry?: AvailabilityOverrideEntry | null) => void;
  onDeleteOverride: (entry: AvailabilityOverrideEntry) => void;
}) {
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
          <AvailabilityTemplateList
            teacher={teacher}
            isSaving={isMutating}
            emptyTitle="Базовый шаблон ещё не задан"
            emptyDescription="Добавьте первый слот доступности, чтобы сформировать недельный шаблон преподавателя."
            groupEmptyDescription="Для этого типа доступности интервалы ещё не заданы."
            onOpenEdit={(entry) => onOpenTemplateDialog(entry)}
            onDeleteEntry={onDeleteTemplateEntry}
          />
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
          <AvailabilityOverridesList
            teacher={teacher}
            weekStart={weekStart}
            isSaving={isMutating}
            currentWeekSummary={(count) =>
              `На текущей неделе активно ${count} ${
                count === 1 ? "исключение" : "исключения"
              }.`
            }
            emptyTitle="Исключений пока нет"
            emptyDescription="Добавляйте отгулы, больничные и временные окна доступности поверх базового шаблона."
            onOpenEdit={(entry) => onOpenOverrideDialog(entry)}
            onDelete={onDeleteOverride}
          />
        </CardContent>
      </Card>
    </div>
  );
}
