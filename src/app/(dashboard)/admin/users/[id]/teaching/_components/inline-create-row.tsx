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
import { getFieldErrorMessages } from "@/lib/form-errors";
import {
  InlineCreateRowFrame,
  InlineCreateRowFrameActions,
} from "@/components/ui/inline-create-row-frame";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  createTeacherSubjectInlineFormSchema,
  createTeacherSubjectInlineValidationSchema,
  gradeInputSchema,
  idSchema,
  type CreateTeacherSubjectInlineFormInput,
  type CreateTeacherSubjectInlineFormValues,
} from "../_lib/schemas";
import type { SubjectOption } from "../_lib/types";

interface InlineCreateTeacherSubjectRowProps {
  subjectOptions: SubjectOption[];
  onSave: (payload: {
    subjectId: string;
    minGrade: number;
    maxGrade: number;
  }) => Promise<boolean>;
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
      minGrade: "",
      maxGrade: "",
    } as CreateTeacherSubjectInlineFormValues,
    validators: {
      onChange: createTeacherSubjectInlineValidationSchema,
      onSubmit: createTeacherSubjectInlineValidationSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = createTeacherSubjectInlineFormSchema.safeParse(value);
      if (!parsed.success) {
        return;
      }

      const success = await onSave(parsed.data as CreateTeacherSubjectInlineFormInput);

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
        <form.Field
          name="subjectId"
          validators={{ onChange: idSchema, onBlur: idSchema }}
        >
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
                    onKeyDown={(event) => onFieldKeyDown(event)}
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
                  <p className="text-xs text-destructive">{errors.join(", ")}</p>
                ) : null}
              </div>
            );
          }}
        </form.Field>
      </TableCell>

      <TableCell className="text-muted-foreground">-</TableCell>

      <TableCell className="w-52 align-top">
        <form.Field
          name="minGrade"
          validators={{ onChange: gradeInputSchema, onBlur: gradeInputSchema }}
        >
          {(field) => (
            <div className="grid gap-1.5">
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
        <form.Field
          name="maxGrade"
          validators={{ onChange: gradeInputSchema, onBlur: gradeInputSchema }}
        >
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
            isSubmitting: state.isSubmitting,
            values: state.values,
          })}
        >
          {({ isSubmitting, values }) => {
            const hasAllRequired =
              values.subjectId.trim().length > 0
              && values.minGrade.trim().length > 0
              && values.maxGrade.trim().length > 0;

            const isValidBySchema = createTeacherSubjectInlineValidationSchema.safeParse(values)
              .success;

            return (
              <InlineCreateRowFrameActions
                onSave={() => void form.handleSubmit()}
                onCancel={onCancel}
                isSaveDisabled={!hasAllRequired || !isValidBySchema || isSubmitting}
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
