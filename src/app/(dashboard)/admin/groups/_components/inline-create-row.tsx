import { useEffect, useRef, type KeyboardEvent } from "react";
import { useForm } from "@tanstack/react-form";
import type { GroupType } from "@/generated/prisma/client";
import {
  InlineCreateRowFrame,
  InlineCreateRowFrameActions,
} from "@/components/ui/inline-create-row-frame";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell } from "@/components/ui/table";
import {
  createGroupSchema,
  groupGradeSchema,
  groupLinkedClassIdsSchema,
  groupNameSchema,
  type CreateGroupInput,
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
      type: "CLASS",
      grade: null,
      linkedClassIds: undefined,
    } as CreateGroupInput,
    validators: {
      onSubmit: createGroupSchema,
    },
    onSubmit: async ({ value }) => {
      const result = await command.execute({
        name: value.name.trim(),
        type: value.type,
        grade: value.grade,
        linkedClassIds: value.linkedClassIds,
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
            onChange: groupNameSchema,
            onBlur: groupNameSchema,
            onSubmit: groupNameSchema,
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <Input
                ref={nameRef}
                placeholder="Название (напр. 10А)"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                onKeyDown={handleKeyDown}
                aria-invalid={field.state.meta.errors.length > 0}
                className="h-7"
              />
              <FieldError errors={field.state.meta.errors} className="text-xs" />
            </Field>
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
                <SelectGroup>
                  {INLINE_CREATE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </form.Field>
      </TableCell>

      <TableCell>
        <form.Field name="type">
          {(typeField) =>
            typeField.state.value === "ELECTIVE_GROUP" ? (
              <form.Field
                name="linkedClassIds"
                validators={{
                  onChange: groupLinkedClassIdsSchema,
                  onSubmit: groupLinkedClassIdsSchema,
                }}
              >
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <ClassGroupsMultiSelect
                      options={classOptions}
                      selectedIds={field.state.value ?? []}
                      onChange={(next) => field.handleChange(next)}
                      placeholder={
                        classOptions.length > 0
                          ? "Классы для кружка"
                          : "Сначала создайте классы"
                      }
                      invalid={field.state.meta.errors.length > 0}
                      disabled={classOptions.length === 0}
                    />
                    <FieldError
                      errors={field.state.meta.errors}
                      className="text-xs"
                    />
                  </Field>
                )}
              </form.Field>
            ) : (
              <form.Field
                name="grade"
                validators={{
                  onChange: groupGradeSchema,
                  onBlur: groupGradeSchema,
                  onSubmit: groupGradeSchema,
                }}
              >
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <Input
                      placeholder="Параллель"
                      type="number"
                      value={field.state.value ?? ""}
                      onChange={(event) => field.handleChange(event.target.valueAsNumber)}
                      onBlur={field.handleBlur}
                      onKeyDown={handleKeyDown}
                      aria-invalid={field.state.meta.errors.length > 0}
                      className="h-7"
                    />
                    <FieldError
                      errors={field.state.meta.errors}
                      className="text-xs"
                    />
                  </Field>
                )}
              </form.Field>
            )
          }
        </form.Field>
      </TableCell>
      <TableCell />
      <TableCell>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting,] as const}
        >
          {([canSubmit, isSubmitting]) => (
            <InlineCreateRowFrameActions
              onSave={() => void form.handleSubmit()}
              onCancel={onCancel}
              isSaveDisabled={!canSubmit || isSubmitting || command.isPending}
              isCancelDisabled={isSubmitting || command.isPending}
            />
          )}
        </form.Subscribe>
      </TableCell>

      <TableCell />
    </InlineCreateRowFrame>
  );
}
