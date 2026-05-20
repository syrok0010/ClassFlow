"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AdminScheduleRoomOption } from "../../_lib/admin-schedule-types";
import type { ScheduleStepperFormValue } from "../../_lib/schedule-editor-flow";
import { NONE_VALUE } from "./constants";
import { SelectEmptyState } from "./select-empty-state";
import type { ScheduleEditorFieldRenderer, ScheduleEditorPatchHandler } from "./types";

export function RoomStep({
  FormField,
  values,
  roomOptions,
  onPatch,
  error,
}: {
  FormField: ScheduleEditorFieldRenderer;
  values: ScheduleStepperFormValue;
  roomOptions: AdminScheduleRoomOption[];
  onPatch: ScheduleEditorPatchHandler;
  error: string | null;
}) {
  if (!values.subjectId) {
    return (
      <p className="text-sm text-muted-foreground">
        Сначала выберите предмет.
      </p>
    );
  }

  return (
    <FormField name="roomId">
      {(field) => (
        <Field data-invalid={Boolean(error)}>
          <FieldLabel>Кабинет</FieldLabel>
          <Select
            value={field.state.value ?? NONE_VALUE}
            disabled={roomOptions.length === 0}
            onValueChange={(nextValue) => {
              field.handleBlur();
              onPatch({
                roomId: nextValue === NONE_VALUE ? null : nextValue,
              });
            }}
          >
            <SelectTrigger className="w-full" aria-invalid={Boolean(error) || undefined}>
              <SelectValue>
                {field.state.value
                  ? roomOptions.find((option) => option.id === field.state.value)?.name ?? "Кабинет"
                  : roomOptions.length === 0
                    ? "Ничего не найдено"
                    : "Выберите кабинет"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {roomOptions.length > 0 ? (
                <SelectGroup>
                  {roomOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name} • {option.seatsCount} мест
                    </SelectItem>
                  ))}
                </SelectGroup>
              ) : (
                <SelectEmptyState message="Ничего не найдено" />
              )}
            </SelectContent>
          </Select>
          <FieldDescription>
            {roomOptions.length === 0
              ? "Для выбранной комбинации нет подходящих кабинетов."
              : "Показываются кабинеты, где можно вести предмет. Конфликты по вместимости подсветятся в расписании."}
          </FieldDescription>
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      )}
    </FormField>
  );
}
