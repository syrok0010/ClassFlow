import { useState, type KeyboardEvent } from "react";
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
import {
  InlineCreateRowFrame,
  InlineCreateRowFrameActions,
} from "@/components/ui/inline-create-row-frame";
import { Input } from "@/components/ui/input";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  createTeacherSubjectInlineFormSchema,
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

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && "message" in error) {
    return (error as { message?: string }).message ?? null;
  }

  return String(error);
}

export function InlineCreateRow({
  subjectOptions,
  onSave,
  onCancel,
}: InlineCreateTeacherSubjectRowProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      subjectId: "",
      minGrade: "",
      maxGrade: "",
    } as CreateTeacherSubjectInlineFormValues,
    onSubmit: async ({ value }) => {
      const parsed = createTeacherSubjectInlineFormSchema.safeParse(value);
      if (!parsed.success) {
        setSubmitError(parsed.error.issues[0]?.message ?? "Проверьте корректность данных");
        return;
      }

      setSubmitError(null);
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
      <TableCell>
        <form.Field name="subjectId">
          {(field) => (
            <Combobox
              items={subjectOptions}
              itemToStringLabel={(item) => item.name}
              itemToStringValue={(item) => item.id}
              value={subjectOptions.find((option) => option.id === field.state.value) ?? null}
                onValueChange={(value) => {
                  field.handleChange(value?.id ?? "");
                  setSubmitError(null);
                }}
            >
              <ComboboxInput
                autoFocus
                placeholder="Выберите предмет"
                showClear
                disabled={form.state.isSubmitting}
                className={cn(
                  "h-7",
                  field.state.meta.errors.length > 0 && "border-destructive"
                )}
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
          )}
        </form.Field>
      </TableCell>

      <TableCell className="text-muted-foreground">-</TableCell>

      <TableCell className="w-35">
        <form.Field name="minGrade">
          {(field) => (
            <Input
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                setSubmitError(null);
              }}
              onBlur={field.handleBlur}
              onKeyDown={(event) => onFieldKeyDown(event)}
              inputMode="numeric"
              placeholder="0"
              className={cn(
                "h-7",
                field.state.meta.errors.length > 0 && "border-destructive"
              )}
              disabled={form.state.isSubmitting}
            />
          )}
        </form.Field>
      </TableCell>

      <TableCell className="w-35">
        <form.Field name="maxGrade">
          {(field) => (
            <Input
              value={field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.value);
                setSubmitError(null);
              }}
              onBlur={field.handleBlur}
              onKeyDown={(event) => onFieldKeyDown(event)}
              inputMode="numeric"
              placeholder="11"
              className={cn(
                "h-7",
                field.state.meta.errors.length > 0 && "border-destructive"
              )}
              disabled={form.state.isSubmitting}
            />
          )}
        </form.Field>
      </TableCell>

      <TableCell className="w-45 align-top">
        <form.Subscribe selector={(state) => ({ isSubmitting: state.isSubmitting })}>
          {({ isSubmitting }) => (
            <>
              <InlineCreateRowFrameActions
                onSave={() => void form.handleSubmit()}
                onCancel={onCancel}
                isSaveDisabled={isSubmitting}
                isCancelDisabled={isSubmitting}
                align="end"
              />
              {submitError ? <p className="mt-1 text-xs text-destructive">{submitError}</p> : null}
            </>
          )}
        </form.Subscribe>
      </TableCell>
    </InlineCreateRowFrame>
  );
}
