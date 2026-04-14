import { type KeyboardEvent } from "react";
import { useForm } from "@tanstack/react-form";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { FormField } from "@/components/ui/form-field";
import {
  InlineCreateRowFrame,
  InlineCreateRowFrameActions,
} from "@/components/ui/inline-create-row-frame";
import { TableCell } from "@/components/ui/table";
import { getFieldErrorMessages } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import {
  subjectGradeRangeSchema,
  type CreateTeacherSubjectFormInput,
} from "../lib/schemas";
import type { SubjectOption } from "../lib/types";

interface InlineCreateTeacherSubjectRowProps {
  subjectOptions: SubjectOption[];
  onSave: (payload: CreateTeacherSubjectFormInput) => Promise<boolean>;
  onCancel: () => void;
}

export function InlineCreateRow({
  subjectOptions,
  onSave,
  onCancel,
}: InlineCreateTeacherSubjectRowProps) {
  const form = useForm({
    defaultValues: {
      subjectId: "",
      minGrade: 1,
      maxGrade: 11,
    },
    validators: {
      onBlur: subjectGradeRangeSchema,
      onChange: subjectGradeRangeSchema,
      onSubmit: subjectGradeRangeSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = subjectGradeRangeSchema.parse(value);
      const success = await onSave(parsed);

      if (success) {
        onCancel();
      }
    },
  });

  const onFieldKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void form.handleSubmit();
    }
  };

  return (
    <InlineCreateRowFrame>
      <TableCell className="align-top">
        <form.Field name="subjectId">
          {(field) => {
            const errors = getFieldErrorMessages(field);
            return (
              <div className="grid gap-1.5">
                <Combobox
                  items={subjectOptions}
                  itemToStringLabel={(item) => item.name}
                  itemToStringValue={(item) => item.id}
                  value={subjectOptions.find((option) => option.id === field.state.value) ?? null}
                  onValueChange={(value) => {
                    field.handleChange(value?.id ?? "");
                    field.handleBlur();
                  }}
                >
                  <ComboboxInput
                    autoFocus
                    placeholder="Выберите предмет"
                    showClear
                    disabled={form.state.isSubmitting}
                    className={cn("h-7", errors.length > 0 && "border-destructive")}
                    onKeyDown={onFieldKeyDown}
                    onBlur={field.handleBlur}
                  />
                  <ComboboxContent className="w-105 p-0">
                    <ComboboxEmpty className="py-3">Ничего не найдено</ComboboxEmpty>
                    <ComboboxList>
                      <ComboboxCollection>
                        {(option: SubjectOption) => (
                          <ComboboxItem key={option.id} value={option}>
                            <span className="truncate">{option.name}</span>
                          </ComboboxItem>
                        )}
                      </ComboboxCollection>
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                {errors.length > 0 ? (
                  <p className="animate-in slide-in-from-top-1 fade-in text-[10px] font-medium tracking-wider text-destructive uppercase duration-200">
                    {errors.join(", ")}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>
      </TableCell>

      <TableCell className="text-muted-foreground">-</TableCell>

      <TableCell className="w-52 align-top">
        <form.Field name="minGrade">
          {(field) => (
            <div className="grid">
              <FormField
                field={field}
                placeholder="0"
                required
                id="inline-create-min-grade"
                type="number"
                inputProps={{ min: 0, max: 11, step: 1 }}
              />
            </div>
          )}
        </form.Field>
      </TableCell>

      <TableCell className="w-52 align-top">
        <form.Field name="maxGrade">
          {(field) => (
            <div className="grid gap-1.5">
              <FormField
                field={field}
                placeholder="11"
                required
                id="inline-create-max-grade"
                type="number"
                inputProps={{ min: 0, max: 11, step: 1 }}
              />
            </div>
          )}
        </form.Field>
      </TableCell>

      <TableCell className="w-45 align-top">
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isValid: state.isValid,
            isSubmitting: state.isSubmitting,
            isPristine: state.isPristine,
          })}
        >
          {({ canSubmit, isValid, isSubmitting, isPristine }) => {
            return (
              <InlineCreateRowFrameActions
                onSave={form.handleSubmit}
                onCancel={onCancel}
                isSaveDisabled={!canSubmit || !isValid || isSubmitting || isPristine}
                isCancelDisabled={isSubmitting}
                align="end"
              />
            );
          }}
        </form.Subscribe>
      </TableCell>
    </InlineCreateRowFrame>
  );
}
