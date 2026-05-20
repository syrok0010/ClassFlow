"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

import type { ScheduleCardKind, ScheduleStepperFormValue } from "../../_lib/schedule-editor-flow";
import type { ScheduleEditorPatchHandler } from "./types";

const CARD_KIND_OPTIONS: Array<{ value: ScheduleCardKind; label: string; description: string }> = [
  { value: "CLASS", label: "Класс", description: "Обычное занятие целого класса." },
  { value: "SUBGROUP", label: "Подгруппа", description: "Занятие части класса по предмету." },
  { value: "ELECTIVE_GROUP", label: "Группа по выбору", description: "Optional-доп с открытостью для классов." },
  { value: "SHARED_CLASSES", label: "Общее занятие", description: "Совместный required/regime-слот для классов." },
];

export function KindStep({
  value,
  onPatch,
  error,
}: {
  value: ScheduleCardKind | null;
  onPatch: ScheduleEditorPatchHandler;
  error: string | null;
}) {
  const selectKind = (nextValue: ScheduleCardKind) => {
    onPatch({
      cardKind: nextValue,
    } satisfies Partial<ScheduleStepperFormValue>);
  };

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel>Тип карточки</FieldLabel>
      <div className="grid gap-2 sm:grid-cols-2">
        {CARD_KIND_OPTIONS.map((option) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              className={cn(
                "flex min-h-24 flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                "hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                isSelected && "border-primary bg-primary/5 text-foreground ring-1 ring-primary",
              )}
              onClick={() => selectKind(option.value)}
            >
              <span className="text-sm font-semibold">{option.label}</span>
              <span className="text-xs leading-snug text-muted-foreground">{option.description}</span>
            </button>
          );
        })}
      </div>
      <FieldDescription>После выбора типа станет доступен подходящий состав.</FieldDescription>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
