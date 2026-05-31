"use client";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFieldErrorMessages } from "@/lib/form-errors";

import { minutesToTime } from "../../_lib/schedule-editor-form";
import type { ScheduleStepperFormValue } from "../../_lib/schedule-editor-flow";
import { DAY_OPTIONS, NONE_VALUE } from "./constants";
import type { ScheduleEditorFieldRenderer, ScheduleEditorPatchHandler } from "./types";

export function TimeStep({
  FormField,
  values,
  durationMinutes,
  onPatch,
  error,
  lockDaySelection = false,
  fixedDayLabel = null,
}: {
  FormField: ScheduleEditorFieldRenderer;
  values: ScheduleStepperFormValue;
  durationMinutes: number | null;
  onPatch: ScheduleEditorPatchHandler;
  error: string | null;
  lockDaySelection?: boolean;
  fixedDayLabel?: string | null;
}) {
  return (
    <>
      <FormField name="dayOfWeek">
        {(field) => {
          const errors = getFieldErrorMessages(field as never);

          if (lockDaySelection) {
            return (
              <Field data-invalid={errors.length > 0}>
                <FieldLabel>Дата занятия</FieldLabel>
                <Input
                  value={
                    fixedDayLabel
                    ?? DAY_OPTIONS.find((option) => Number(option.value) === field.state.value)?.label
                    ?? "Дата не указана"
                  }
                  disabled
                  aria-invalid={errors.length > 0 || undefined}
                />
                {errors.length > 0 ? <FieldError>{errors[0]}</FieldError> : null}
              </Field>
            );
          }

          return (
            <Field data-invalid={errors.length > 0}>
              <FieldLabel>День</FieldLabel>
              <Select
                value={field.state.value === null ? NONE_VALUE : String(field.state.value)}
                onValueChange={(value) => {
                  field.handleBlur();
                  onPatch({
                    dayOfWeek: value === NONE_VALUE ? null : Number(value),
                    startMinutes: value === NONE_VALUE ? null : values.startMinutes,
                  });
                }}
              >
                <SelectTrigger className="w-full" aria-invalid={errors.length > 0 || undefined}>
                  <SelectValue>
                    {field.state.value === null
                      ? "Без дня (временная область)"
                      : DAY_OPTIONS.find((option) => Number(option.value) === field.state.value)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectGroup>
                    <SelectItem value={NONE_VALUE}>Без дня (временная область)</SelectItem>
                    {DAY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.length > 0 ? <FieldError>{errors[0]}</FieldError> : null}
            </Field>
          );
        }}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField name="startMinutes">
          {(field) => {
            const errors = getFieldErrorMessages(field as never);

            return (
              <Field data-invalid={errors.length > 0}>
                <FieldLabel htmlFor="schedule-editor-start-time">Время начала</FieldLabel>
                <Input
                  id="schedule-editor-start-time"
                  type="time"
                  value={minutesToTime(field.state.value)}
                  aria-invalid={errors.length > 0 || undefined}
                  disabled={values.dayOfWeek === null}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    onPatch({
                      startMinutes: Number.isNaN(event.target.valueAsNumber)
                        ? null
                        : event.target.valueAsNumber / 1000 / 60,
                    })}
                />
                {errors.length > 0 ? <FieldError>{errors[0]}</FieldError> : null}
              </Field>
            );
          }}
        </FormField>

        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="schedule-editor-duration">Длительность</FieldLabel>
          <Input
            id="schedule-editor-duration"
            value={durationMinutes === null ? "Не задана" : `${durationMinutes} мин`}
            disabled
            aria-invalid={Boolean(error) || undefined}
          />
        </Field>

        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="schedule-editor-end-time">Время окончания</FieldLabel>
          <Input
            id="schedule-editor-end-time"
            type="time"
            value={minutesToTime(values.endMinutes)}
            disabled
            aria-invalid={Boolean(error) || undefined}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      </div>
    </>
  );
}
