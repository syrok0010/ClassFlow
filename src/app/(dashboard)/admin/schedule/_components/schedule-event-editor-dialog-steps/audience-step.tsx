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

import type {
  AdminScheduleClassRow,
  AdminScheduleElectiveGroupOption,
  AdminScheduleGroupOption,
} from "../../_lib/admin-schedule-types";
import {
  getGroupOptionsByKind,
  getGroupTypeLabel,
  type ScheduleCardKind,
  type ScheduleStepperFormValue,
} from "../../_lib/schedule-editor-flow";
import { ScheduleMultiSelect, type FilterOption } from "../schedule-multi-select";
import { NONE_VALUE } from "./constants";
import { SelectEmptyState } from "./select-empty-state";
import type { ScheduleEditorFieldRenderer, ScheduleEditorPatchHandler } from "./types";

export function AudienceStep({
  FormField,
  values,
  classOptions,
  classRows,
  directGroupOptions,
  electiveGroupOptions,
  onPatch,
  error,
}: {
  FormField: ScheduleEditorFieldRenderer;
  values: ScheduleStepperFormValue;
  classOptions: FilterOption[];
  classRows: AdminScheduleClassRow[];
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  onPatch: ScheduleEditorPatchHandler;
  error: string | null;
}) {
  if (values.cardKind === "SHARED_CLASSES") {
    return (
      <FormField name="coveredClassIds">
        {(field) => (
          <Field data-invalid={Boolean(error)}>
            <FieldLabel>Классы</FieldLabel>
            <ScheduleMultiSelect
              title="Классы"
              options={classOptions}
              selectedIds={field.state.value}
              onChange={(next) => {
                field.handleBlur();
                onPatch({ coveredClassIds: next });
              }}
            />
            <FieldDescription>
              {field.state.value.length > 0
                ? getSelectedClassNames(field.state.value, classRows)
                : "Нужно выбрать минимум два класса."}
            </FieldDescription>
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        )}
      </FormField>
    );
  }

  const groupOptions = getGroupOptionsByKind(values.cardKind, directGroupOptions, electiveGroupOptions);
  const selectedGroup = groupOptions.find((option) => option.id === values.deliveryGroupId) ?? null;
  const openClassNames = getSelectedClassNames(values.openClassIds, classRows);
  const groupPlaceholder = values.cardKind === "ELECTIVE_GROUP"
    ? "Выберите группу по выбору"
    : "Выберите группу";

  return (
    <>
      <FormField name="deliveryGroupId">
        {(field) => (
          <Field data-invalid={Boolean(error)}>
            <FieldLabel>{values.cardKind === "ELECTIVE_GROUP" ? "Группа по выбору" : "Группа"}</FieldLabel>
            <Select
              value={field.state.value ?? NONE_VALUE}
              disabled={groupOptions.length === 0}
              onValueChange={(nextValue) => {
                field.handleBlur();
                onPatch({
                  deliveryGroupId: nextValue === NONE_VALUE ? null : nextValue,
                });
              }}
            >
              <SelectTrigger className="w-full" aria-invalid={Boolean(error) || undefined}>
                <SelectValue>
                  {selectedGroup?.name ?? (groupOptions.length === 0 ? "Ничего не найдено" : groupPlaceholder)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {groupOptions.length > 0 ? (
                  <SelectGroup>
                    {groupOptions.map((option) => (
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
            <FieldDescription>{getGroupSelectionDescription(values.cardKind, selectedGroup)}</FieldDescription>
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        )}
      </FormField>

      {values.cardKind === "ELECTIVE_GROUP" ? (
        <FormField name="openClassIds">
          {(field) => (
            <Field>
              <FieldLabel>Открыт для классов</FieldLabel>
              <ScheduleMultiSelect
                title="Классы"
                options={classOptions}
                selectedIds={field.state.value}
                onChange={(next) => {
                  field.handleBlur();
                  onPatch({ openClassIds: next });
                }}
              />
              <FieldDescription>
                {openClassNames || "Эти классы увидят карточку у себя в строках расписания."}
              </FieldDescription>
            </Field>
          )}
        </FormField>
      ) : null}
    </>
  );
}

function getSelectedClassNames(classIds: string[], classRows: AdminScheduleClassRow[]) {
  return classRows
    .filter((row) => classIds.includes(row.id))
    .map((row) => row.name)
    .join(", ");
}

function getGroupSelectionDescription(
  cardKind: ScheduleCardKind | null,
  group: AdminScheduleGroupOption | AdminScheduleElectiveGroupOption | null,
) {
  if (!cardKind) {
    return "Сначала выберите тип карточки.";
  }

  if (!group) {
    if (cardKind === "SUBGROUP") {
      return "Показываются только подгруппы.";
    }

    if (cardKind === "CLASS") {
      return "Показываются только классы.";
    }

    if (cardKind === "ELECTIVE_GROUP") {
      return "Показываются только группы по выбору.";
    }

    return null;
  }

  if (cardKind === "ELECTIVE_GROUP") {
    return `${group.studentCount} чел.`;
  }

  return `${getGroupTypeLabel((group as AdminScheduleGroupOption).type)} • ${group.studentCount} чел.`;
}
