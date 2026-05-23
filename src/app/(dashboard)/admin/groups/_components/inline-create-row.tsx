import { useEffect, useRef, type KeyboardEvent } from "react";
import { useForm } from "@tanstack/react-form";
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
  inlineCreateGroupFormSchema,
  type InlineCreateGroupInput,
  parseGroupGradeInput,
} from "../_lib/group-schemas";
import { flushSync } from "react-dom";
import { getFieldErrorMessages } from "@/lib/form-errors";
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
  classOptions: ClassGroupOption[];
  onSave: (data: InlineCreateGroupInput) => Promise<boolean>;
  onCancel: () => void;
}

export function InlineCreateRow({
  classOptions,
  onSave,
  onCancel,
}: InlineCreateRowProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const defaultValues: {
    name: string;
    type: InlineCreateGroupInput["type"];
    grade: string;
    linkedClassIds: string[];
  } = {
    name: "",
    type: "CLASS",
    grade: "",
    linkedClassIds: [],
  };

  const form = useForm({
    defaultValues,
    validators: {
      onChange: inlineCreateGroupFormSchema,
    },
    onSubmit: async ({ value }) => {
      const payload: InlineCreateGroupInput =
        value.type === "ELECTIVE_GROUP"
          ? {
              name: value.name,
              type: value.type,
              grade: parseGroupGradeInput(value.grade),
              linkedClassIds: value.linkedClassIds,
            }
          : {
              name: value.name,
              type: value.type,
              grade: parseGroupGradeInput(value.grade),
            };

      const success = await onSave(payload);
      if (success) {
        flushSync(() => form.reset());
      }
    },
  });

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleTextFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      form.handleSubmit();
    }

    if (event.key === "Escape") {
      onCancel();
    }
  };

  return (
    <InlineCreateRowFrame>
      <TableCell />
      <TableCell>
        <form.Field name="name">
          {(field) => (
            <div>
              <Input
                ref={nameRef}
                placeholder="Название (напр. 10А)"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                onKeyDown={handleTextFieldKeyDown}
                className={cn(
                  "h-7",
                  field.state.meta.errors.length > 0 && "border-destructive"
                )}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                <p className="text-xs text-destructive mt-1">
                  {getFieldErrorMessages(field).join(", ")}
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
              onValueChange={(value) => {
                const nextType = value as "CLASS" | "ELECTIVE_GROUP";
                field.handleChange(nextType);

                if (nextType === "CLASS") {
                  form.setFieldValue("linkedClassIds", []);
                  return;
                }

                form.setFieldValue("grade", "");
              }}
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
        <form.Subscribe selector={(state) => state.values.type}>
          {(type) =>
            type === "ELECTIVE_GROUP" ? (
              <form.Field name="linkedClassIds">
                {(field) => (
                  <div>
                    <ClassGroupsMultiSelect
                      options={classOptions}
                      selectedIds={field.state.value}
                      onChange={(next) => field.handleChange(next)}
                      placeholder={
                        classOptions.length > 0 ? "Классы для кружка" : "Сначала создайте классы"
                      }
                      invalid={field.state.meta.errors.length > 0}
                      disabled={classOptions.length === 0}
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                      <p className="mt-1 text-xs text-destructive">
                        {getFieldErrorMessages(field).join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>
            ) : (
              <form.Field name="grade">
                {(field) => (
                  <div>
                    <Input
                      placeholder="Параллель"
                      type="number"
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      onBlur={field.handleBlur}
                      onKeyDown={handleTextFieldKeyDown}
                      className={cn(
                        "h-7",
                        field.state.meta.errors.length > 0 && "border-destructive"
                      )}
                    />
                    {field.state.meta.isTouched && field.state.meta.errors.length > 0 ? (
                      <p className="mt-1 text-xs text-destructive">
                        {getFieldErrorMessages(field).join(", ")}
                      </p>
                    ) : null}
                  </div>
                )}
              </form.Field>
            )
          }
        </form.Subscribe>
      </TableCell>
      <TableCell/>
      <TableCell>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        >
          {([canSubmit, isSubmitting]) => (
            <InlineCreateRowFrameActions
              onSave={() => form.handleSubmit()}
              onCancel={onCancel}
              isSaveDisabled={isSubmitting || !canSubmit}
            />
          )}
        </form.Subscribe>
      </TableCell>

      <TableCell />
    </InlineCreateRowFrame>
  );
}
