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

import type { AdminScheduleTeacherOption } from "../../_lib/admin-schedule-types";
import type { ScheduleEditorSubject } from "../../_lib/schedule-editor-form";
import type { ScheduleStepperFormValue } from "../../_lib/schedule-editor-flow";
import { NONE_VALUE } from "./constants";
import { SelectEmptyState } from "./select-empty-state";
import type { ScheduleEditorFieldRenderer, ScheduleEditorPatchHandler } from "./types";

export function TeacherStep({
  FormField,
  values,
  subjectOptions,
  teacherOptions,
  onPatch,
  error,
}: {
  FormField: ScheduleEditorFieldRenderer;
  values: ScheduleStepperFormValue;
  subjectOptions: ScheduleEditorSubject[];
  teacherOptions: AdminScheduleTeacherOption[];
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

  const subject = subjectOptions.find((option) => option.id === values.subjectId) ?? null;
  const isTeacherOptional = subject?.type === "REGIME";

  return (
    <FormField name="teacherId">
      {(field) => (
        <Field data-invalid={Boolean(error)}>
          <FieldLabel>Учитель</FieldLabel>
          <Select
            value={field.state.value ?? NONE_VALUE}
            onValueChange={(nextValue) => {
              field.handleBlur();
              onPatch({
                teacherId: nextValue === NONE_VALUE ? null : nextValue,
              });
            }}
          >
            <SelectTrigger className="w-full" aria-invalid={Boolean(error) || undefined}>
              <SelectValue>
                {field.state.value
                  ? teacherOptions.find((option) => option.id === field.state.value)?.name ?? "Учитель"
                  : "Не выбран"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                <SelectItem value={NONE_VALUE}>Не выбран</SelectItem>
                {teacherOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectGroup>
              {teacherOptions.length === 0 && !isTeacherOptional ? <SelectEmptyState message="Ничего не найдено" /> : null}
            </SelectContent>
          </Select>
          <FieldDescription>
            {teacherOptions.length === 0 && isTeacherOptional
              ? "Для режимного предмета учителя можно не назначать."
              : teacherOptions.length === 0
                ? "Для выбранной комбинации нет подходящих учителей."
                : isTeacherOptional
                  ? "Для режимного предмета учителя можно не назначать."
                  : "Показываются только учителя, которым назначен выбранный предмет."}
          </FieldDescription>
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      )}
    </FormField>
  );
}
