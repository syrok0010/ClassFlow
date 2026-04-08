import { type KeyboardEvent } from "react";
import { useForm, type AnyFieldApi } from "@tanstack/react-form";
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
import { cn } from "@/lib/utils";
import {
  createTeacherSubjectInlineFormSchema,
  createTeacherSubjectInlineValidationSchema,
  gradeTextValidationSchema,
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

function collectFieldErrors(field: AnyFieldApi): string[] {
  return field.state.meta.errors
    .flatMap((error) => {
      if (!error) {
        return [];
      }
      if (typeof error === "string") {
        return [error];
      }
      if (typeof error === "object" && "message" in error) {
        const message = (error as { message?: string }).message;
        return message ? [message] : [];
      }
      return [String(error)];
    })
    .filter(Boolean);
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
            const errors = collectFieldErrors(field);
            return (
              <div className="grid gap-1.5">
                <Combobox
                  items={subjectOptions}
                  itemToStringLabel={(item) => item.name}
                  itemToStringValue={(item) => item.id}
                  value={subjectOptions.find((option) => option.id === field.state.value) ?? null}
                  onValueChange={(value) => {
                    field.handleChange(value?.id ?? "");
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

      <TableCell className="w-44 align-top">
        <form.Field
          name="minGrade"
          validators={{ onChange: gradeTextValidationSchema, onBlur: gradeTextValidationSchema }}
        >
          {(field) => (
            <div className="[&_span]:block [&_span]:normal-case [&_span]:tracking-normal [&_span]:leading-4 [&_span]:whitespace-normal [&_span]:break-words [&_span]:animate-none">
              <FormField
                field={field}
                placeholder="0"
                required
                id="inline-create-min-grade"
              />
            </div>
          )}
        </form.Field>
      </TableCell>

      <TableCell className="w-44 align-top">
        <form.Field
          name="maxGrade"
          validators={{ onChange: gradeTextValidationSchema, onBlur: gradeTextValidationSchema }}
        >
          {(field) => (
            <div className="[&_span]:block [&_span]:normal-case [&_span]:tracking-normal [&_span]:leading-4 [&_span]:whitespace-normal [&_span]:break-words [&_span]:animate-none">
              <FormField
                field={field}
                placeholder="11"
                required
                id="inline-create-max-grade"
              />
            </div>
          )}
        </form.Field>
      </TableCell>

      <TableCell className="w-45 align-top">
        <form.Subscribe
          selector={(state) => ({
            isSubmitting: state.isSubmitting,
            canSubmit: state.canSubmit,
            values: state.values,
          })}
        >
          {({ isSubmitting, canSubmit, values }) => {
            const hasAllRequired =
              values.subjectId.trim().length > 0
              && values.minGrade.trim().length > 0
              && values.maxGrade.trim().length > 0;

            return (
              <InlineCreateRowFrameActions
                onSave={() => void form.handleSubmit()}
                onCancel={onCancel}
                isSaveDisabled={!hasAllRequired || !canSubmit || isSubmitting}
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
