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

import type { AdminScheduleElectiveGroupOption } from "../../_lib/admin-schedule-types";
import type { ScheduleEditorSubject, ScheduleStepperFormValue } from "../../_lib/schedule-editor-flow";
import { NONE_VALUE } from "./constants";
import { SelectEmptyState } from "./select-empty-state";
import type { ScheduleEditorFieldRenderer, ScheduleEditorPatchHandler } from "./types";

export function SubjectStep({
  FormField,
  values,
  subjectOptions,
  electiveGroupOptions,
  onPatch,
  error,
}: {
  FormField: ScheduleEditorFieldRenderer;
  values: ScheduleStepperFormValue;
  subjectOptions: ScheduleEditorSubject[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  onPatch: ScheduleEditorPatchHandler;
  error: string | null;
}) {
  const selectedSubject = subjectOptions.find((option) => option.id === values.subjectId) ?? null;
  const electiveGroup = values.cardKind === "ELECTIVE_GROUP"
    ? electiveGroupOptions.find((option) => option.id === values.deliveryGroupId) ?? null
    : null;

  return (
    <FormField name="subjectId">
      {(field) => (
        <Field data-invalid={Boolean(error)}>
          <FieldLabel>Предмет</FieldLabel>
          <Select
            value={field.state.value || NONE_VALUE}
            disabled={subjectOptions.length === 0}
            onValueChange={(nextValue) => {
              field.handleBlur();
              onPatch({
                subjectId: nextValue && nextValue !== NONE_VALUE ? nextValue : "",
              });
            }}
          >
            <SelectTrigger className="w-full" aria-invalid={Boolean(error) || undefined}>
              <SelectValue>
                {selectedSubject?.name ?? (subjectOptions.length === 0 ? "Ничего не найдено" : "Выберите предмет")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {subjectOptions.length > 0 ? (
                <SelectGroup>
                  {subjectOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ) : (
                <SelectEmptyState message="Ничего не найдено" />
              )}
            </SelectContent>
          </Select>
          {subjectOptions.length === 0 ? (
            <FieldDescription>Для выбранной сущности нет предметов с настроенной длительностью.</FieldDescription>
          ) : null}
          {values.cardKind === "ELECTIVE_GROUP" && electiveGroup ? (
            <FieldDescription>Предмет уже закреплен за группой «{electiveGroup.name}».</FieldDescription>
          ) : null}
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      )}
    </FormField>
  );
}
