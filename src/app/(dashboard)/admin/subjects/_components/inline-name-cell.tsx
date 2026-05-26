import {
  useEffect,
  useRef,
  type FocusEvent,
} from "react";
import { useForm } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { SubjectsCrudCommands } from "../_hooks/use-subjects-crud";
import { idSchema, updateSubjectSchema } from "../_lib/subject-schemas";

const renameSubjectFormSchema = updateSubjectSchema.extend({
  id: idSchema,
});

interface InlineNameCellProps {
  defaultValue: string;
  command: SubjectsCrudCommands["renameSubject"];
  subjectId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function InlineNameCell({
  defaultValue,
  command,
  subjectId,
  onSaved,
  onCancel,
}: InlineNameCellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      id: subjectId,
      name: defaultValue,
    },
    validators: {
      onSubmit: renameSubjectFormSchema,
    },
    onSubmit: async ({ value }) => {
      const data = renameSubjectFormSchema.parse(value);
      if (data.name === defaultValue.trim()) {
        onCancel();
        return;
      }

      try {
        await command.mutateAsync(data);
        onSaved();
      } catch {
        // Toast is shown by the mutation.
      }
    },
  });

  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const onBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (containerRef.current?.contains(event.relatedTarget as Node)) {
      return;
    }

    void form.handleSubmit();
  };

  useHotkey(
    "Enter",
    (event) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    {
      target: containerRef,
      enabled: true,
      preventDefault: true,
    }
  );

  useHotkey(
    "Escape",
    (event) => {
      event.preventDefault();
      onCancel();
    },
    {
      target: containerRef,
      enabled: true,
      preventDefault: true,
    }
  );

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      <form.Field name="name" validators={{ onBlur: updateSubjectSchema.shape.name }}>
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0}>
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={(event) => {
                  field.handleBlur();
                  onBlur(event);
                }}
                aria-invalid={field.state.meta.errors.length > 0}
                className="h-7 w-full min-w-0"
              />
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
                {([canSubmit, isSubmitting]) => (
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => void form.handleSubmit()}
                    disabled={!canSubmit || isSubmitting}
                    title="Сохранить"
                  >
                    <Check className="size-3.5" />
                  </Button>
                )}
              </form.Subscribe>
            </div>
            {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
              <FieldError errors={field.state.meta.errors} className="text-xs" />
            ) : null}
          </Field>
        )}
      </form.Field>
    </div>
  );
}
