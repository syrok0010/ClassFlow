import { useEffect, useRef, type KeyboardEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { GroupType } from "@/generated/prisma/client";
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
  groupGradeInputSchema,
  groupNameSchema,
  parseGroupGradeInput,
} from "../_lib/group-schemas";

const INLINE_CREATE_TYPE_OPTIONS = [
  { value: "CLASS", label: "Класс" },
  { value: "ELECTIVE_GROUP", label: "Кружок" },
] as const;

const INLINE_CREATE_TYPE_ITEMS: Record<string, string> = Object.fromEntries(
  INLINE_CREATE_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

interface InlineCreateRowProps {
  onSave: (data: {
    name: string;
    type: GroupType;
    grade?: number | null;
  }) => Promise<boolean>;
  onCancel: () => void;
}

export function InlineCreateRow({ onSave, onCancel }: InlineCreateRowProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      type: "CLASS" as GroupType,
      grade: "" as string,
    },
    onSubmit: async ({ value }) => {
      const success = await onSave({
        name: value.name,
        type: value.type,
        grade: parseGroupGradeInput(value.grade),
      });
      if (success) {
        onCancel();
      }
    },
  });

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      form.handleSubmit();
    }

    if (event.key === "Escape") {
      onCancel();
    }
  };

  return (
    <TableRow className="bg-primary/5 animate-in fade-in-0 slide-in-from-top-1">
      <TableCell />
      <TableCell>
        <form.Field
          name="name"
          validators={{
            onBlur: groupNameSchema,
          }}
        >
          {(field) => (
            <div>
              <Input
                ref={nameRef}
                placeholder="Название (напр. 10А)"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                onKeyDown={handleKeyDown}
                className={cn(
                  "h-7",
                  field.state.meta.errors.length > 0 && "border-destructive"
                )}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                <p className="text-xs text-destructive mt-1">
                  {field.state.meta.errors
                    .flatMap((error) => (error ? [error.message] : []))
                    .join(", ")}
                </p>
              )}
            </div>
          )}
        </form.Field>
      </TableCell>

      <TableCell>
        <form.Field name="type">
          {(field) => (
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value as GroupType)}
              items={INLINE_CREATE_TYPE_ITEMS}
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INLINE_CREATE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </form.Field>
      </TableCell>

      <TableCell>
        <form.Field
          name="grade"
          validators={{
            onBlur: groupGradeInputSchema,
          }}
        >
          {(field) => (
            <div>
              <Input
                placeholder="Параллель"
                type="number"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                onKeyDown={handleKeyDown}
                className={cn(
                  "h-7",
                  field.state.meta.errors.length > 0 && "border-destructive"
                )}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                <p className="text-xs text-destructive mt-1">
                  {field.state.meta.errors
                    .flatMap((error) => (error ? [error.message] : []))
                    .join(", ")}
                </p>
              )}
            </div>
          )}
        </form.Field>
      </TableCell>

      <TableCell colSpan={2}>
        <form.Subscribe selector={(state) => [state.isSubmitting, state.values.name] as const}>
          {([isSubmitting, name]) => (
            <div className="flex items-center gap-2">
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

      <TableCell />
    </TableRow>
  );
}
