import { useEffect, useRef, type KeyboardEvent } from "react";
import type { SubjectType } from "@/generated/prisma/client";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  subjectNameSchema,
  subjectTypeSchema,
} from "../_lib/subject-schemas";
import { SUBJECT_LABELS, TYPE_OPTIONS } from "../_lib/constants";

interface InlineCreateRowProps {
  onSave: (data: { name: string; type: SubjectType }) => Promise<boolean>;
  onCancel: () => void;
}

export function InlineCreateRow({ onSave, onCancel }: InlineCreateRowProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      type: "ACADEMIC" as SubjectType,
    },
    onSubmit: async ({ value }) => {
      const success = await onSave({
        name: value.name,
        type: value.type,
      });

      if (success) {
        onCancel();
      }
    },
  });

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      form.handleSubmit();
    }
  };

  return (
    <TableRow className="animate-in fade-in-0 slide-in-from-top-1 bg-primary/5">
      <TableCell>
        <form.Field name="name" validators={{ onBlur: subjectNameSchema }}>
          {(field) => (
            <div>
              <Input
                ref={nameRef}
                placeholder="Название предмета"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                onKeyDown={handleNameKeyDown}
                className={cn(
                  "h-7",
                  field.state.meta.errors.length > 0 && "border-destructive"
                )}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                <p className="mt-1 text-xs text-destructive">
                  {field.state.meta.errors
                    .flatMap((error) => (error ? [error.message] : []))
                    .join(", ")}
                </p>
              ) : null}
            </div>
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
                {TYPE_OPTIONS.map((option) => (
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
        <form.Subscribe selector={(state) => [state.isSubmitting, state.values.name] as const}>
          {([isSubmitting, name]) => (
            <div className="flex items-center justify-end gap-2">
              <Button
                size="sm"
                onClick={() => form.handleSubmit()}
                disabled={!name.trim() || isSubmitting}
              >
                Сохранить
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancel}>
                Отмена
              </Button>
            </div>
          )}
        </form.Subscribe>
      </TableCell>
    </TableRow>
  );
}
