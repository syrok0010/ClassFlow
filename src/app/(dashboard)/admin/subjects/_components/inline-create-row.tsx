import { useEffect, useRef } from "react";
import type { SubjectType } from "@/generated/prisma/client";
import { useForm } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  InlineCreateRowFrame,
  InlineCreateRowFrameActions,
} from "@/components/ui/inline-create-row-frame";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell } from "@/components/ui/table";
import { Field, FieldError } from "@/components/ui/field";
import { SUBJECT_LABELS, SUBJECT_TYPE_OPTIONS } from "@/lib/constants";
import type { SubjectsCrudCommands } from "../_hooks/use-subjects-crud";
import {
  createSubjectSchema,
  subjectNameSchema,
  subjectTypeSchema,
} from "../_lib/subject-schemas";
import { flushSync } from "react-dom";

interface InlineCreateRowProps {
  command: SubjectsCrudCommands["createSubject"];
  onCancel: () => void;
}

export function InlineCreateRow({ command, onCancel }: InlineCreateRowProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      type: "ACADEMIC" as SubjectType,
    },
    validators: {
      onSubmit: createSubjectSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await command.mutateAsync(createSubjectSchema.parse(value));
        flushSync(() => form.reset());
      } catch {
        // Toast is shown by the mutation.
      }
    },
  });

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useHotkey(
    "Escape", 
    onCancel,
    {
      target: nameRef,
      enabled: true,
      preventDefault: true,
    }
  );

  useHotkey(
    "Enter",
    () => void form.handleSubmit(),
    {
      target: nameRef,
      enabled: true,
      preventDefault: true,
    }
  );

  return (
    <InlineCreateRowFrame>
      <TableCell>
        <form.Field name="name" validators={{ onBlur: subjectNameSchema }}>
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <Input
                ref={nameRef}
                placeholder="Название предмета"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
                className="h-7"
              />
              {field.state.meta.isTouched ? (
                <FieldError errors={field.state.meta.errors} className="text-xs" />
              ) : null}
            </Field>
          )}
        </form.Field>
      </TableCell>

      <TableCell>
        <form.Field name="type" validators={{ onChange: subjectTypeSchema }}>
          {(field) => (
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value as SubjectType)}
              items={SUBJECT_LABELS}
            >
              <SelectTrigger size="sm" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBJECT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </form.Field>
      </TableCell>

      <TableCell />

      <TableCell>
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <InlineCreateRowFrameActions
              onSave={() => form.handleSubmit()}
              onCancel={onCancel}
              isSaveDisabled={!canSubmit || isSubmitting}
              align="end"
            />
          )}
        </form.Subscribe>
      </TableCell>
    </InlineCreateRowFrame>
  );
}
