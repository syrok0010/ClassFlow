import { useEffect, useRef, type KeyboardEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { GroupType } from "@/generated/prisma/client";
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
import { cn } from "@/lib/utils";
import {
  groupGradeInputSchema,
  groupNameSchema,
  parseGroupGradeInput,
} from "../_lib/group-schemas";
import type { GroupsCrudCommands } from "../_hooks/use-groups-crud";
import { flushSync } from "react-dom";
import {
  ClassGroupsMultiSelect,
  type ClassGroupOption,
} from "./class-groups-multi-select";

const INLINE_CREATE_TYPE_OPTIONS = [
  { value: "CLASS", label: "Класс" },
  { value: "ELECTIVE_GROUP", label: "Кружок" },
] as const;

const INLINE_CREATE_TYPE_ITEMS: Record<string, string> = Object.fromEntries(
  INLINE_CREATE_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

interface InlineCreateRowProps {
  command: GroupsCrudCommands["createGroup"];
  classOptions: ClassGroupOption[];
  onCancel: () => void;
}

export function InlineCreateRow({
  command,
  classOptions,
  onCancel,
}: InlineCreateRowProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      type: "CLASS" as GroupType,
      grade: "" as string,
      linkedClassIds: [] as string[],
    },
    onSubmit: async ({ value }) => {
      const result = await command.execute({
        name: value.name,
        type: value.type,
        grade: parseGroupGradeInput(value.grade),
        linkedClassIds:
          value.type === "ELECTIVE_GROUP" ? value.linkedClassIds : undefined,
      });
      if (result === null) {
        return;
      }
      flushSync(() => form.reset());
    },
  });

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void form.handleSubmit();
    }

    if (event.key === "Escape") {
      onCancel();
    }
  };

  return (
    <InlineCreateRowFrame>
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
        <form.Field name="type">
          {(typeField) =>
            typeField.state.value === "ELECTIVE_GROUP" ? (
              <form.Field name="linkedClassIds">
                {(field) => {
                  const showError =
                    field.state.meta.isTouched && field.state.value.length === 0;

                  return (
                    <div>
                      <ClassGroupsMultiSelect
                        options={classOptions}
                        selectedIds={field.state.value}
                        onChange={(next) => field.handleChange(next)}
                        placeholder={
                          classOptions.length > 0
                            ? "Классы для кружка"
                            : "Сначала создайте классы"
                        }
                        invalid={showError}
                        disabled={classOptions.length === 0}
                      />
                      {showError && (
                        <p className="mt-1 text-xs text-destructive">
                          Выберите хотя бы один класс
                        </p>
                      )}
                    </div>
                  );
                }}
              </form.Field>
            ) : (
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
                    {field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0 && (
                        <p className="text-xs text-destructive mt-1">
                          {field.state.meta.errors
                            .flatMap((error) => (error ? [error.message] : []))
                            .join(", ")}
                        </p>
                      )}
                  </div>
                )}
              </form.Field>
            )
          }
        </form.Field>
      </TableCell>
      <TableCell/>
      <TableCell>
        <form.Subscribe
          selector={(state) =>
            [
              state.isSubmitting,
              state.values.name,
              state.values.type,
              state.values.linkedClassIds,
            ] as const
          }
        >
          {([isSubmitting, name, type, linkedClassIds]) => (
            <InlineCreateRowFrameActions
              onSave={() => form.handleSubmit()}
              onCancel={onCancel}
              isSaveDisabled={
                !name.trim() ||
                isSubmitting ||
                (type === "ELECTIVE_GROUP" && linkedClassIds.length === 0)
              }
            />
          )}
        </form.Subscribe>
      </TableCell>

      <TableCell />
    </InlineCreateRowFrame>
  );
}
