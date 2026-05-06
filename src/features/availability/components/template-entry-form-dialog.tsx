import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFieldErrorMessages } from "@/lib/form-errors";
import type {
  TeacherAvailabilityTemplateEditorInput,
} from "@/features/availability/lib/schemas";
import { teacherAvailabilityTemplateEditorSchema } from "@/features/availability/lib/schemas";
import type { AvailabilityTemplateEntry } from "@/features/availability/lib/types";
import {
  AVAILABILITY_TYPE_LABELS,
  DAY_CONFIG,
  getMinutesFromTimeInput,
  getTimeInputValue,
} from "@/features/availability/lib/utils";

const DAY_LABELS_BY_VALUE = new Map(DAY_CONFIG.map((day) => [String(day.dayOfWeek), day.label]));

export function TemplateEntryFormDialog({
  open,
  teacherName,
  entry,
  initialValues,
  isSaving,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  teacherName: string;
  entry: AvailabilityTemplateEntry | null;
  initialValues?: Partial<
    Pick<TeacherAvailabilityTemplateEditorInput, "dayOfWeek" | "startTime" | "endTime">
  >;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    entry: TeacherAvailabilityTemplateEditorInput,
    previousId?: string,
  ) => Promise<boolean>;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: {
      dayOfWeek: entry?.dayOfWeek ?? initialValues?.dayOfWeek ?? 1,
      startTime: entry?.startTime ?? initialValues?.startTime ?? 8 * 60,
      endTime: entry?.endTime ?? initialValues?.endTime ?? 9 * 60,
      type: entry?.type ?? "AVAILABLE",
    } satisfies TeacherAvailabilityTemplateEditorInput,
    validators: {
      onChange: teacherAvailabilityTemplateEditorSchema,
      onSubmit: teacherAvailabilityTemplateEditorSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);

      const success = await onSubmit(value, entry?.id);

      if (!success) {
        setSubmitError("Не удалось сохранить интервал");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{entry ? "Изменить интервал" : "Добавить интервал"}</DialogTitle>
            <DialogDescription>
              {teacherName}. Новый слот будет встроен в недельный шаблон с нормализацией
              пересечений.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <form.Field name="dayOfWeek">
              {(field) => {
                const errors = getFieldErrorMessages(field);
                return (
                  <Field data-invalid={errors.length > 0}>
                    <FieldLabel htmlFor="template-day">День недели</FieldLabel>
                    <Select
                      value={String(field.state.value)}
                      onValueChange={(value) => {
                        field.handleChange(Number(value));
                        field.handleBlur();
                      }}
                    >
                      <SelectTrigger
                        id="template-day"
                        className="w-full"
                        aria-invalid={errors.length > 0 || undefined}
                      >
                        <SelectValue>
                          {DAY_LABELS_BY_VALUE.get(String(field.state.value)) ?? "Выберите день"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {DAY_CONFIG.map((day) => (
                            <SelectItem key={day.dayOfWeek} value={String(day.dayOfWeek)}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {errors.length > 0 ? <FieldError>{errors[0]}</FieldError> : null}
                  </Field>
                );
              }}
            </form.Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="startTime">
                {(field) => {
                  const errors = getFieldErrorMessages(field);

                  return (
                    <Field data-invalid={errors.length > 0}>
                      <FieldLabel htmlFor="template-start-time">Начало</FieldLabel>
                      <Input
                        id="template-start-time"
                        type="time"
                        value={getTimeInputValue(field.state.value)}
                        aria-invalid={errors.length > 0 || undefined}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(getMinutesFromTimeInput(event.currentTarget.valueAsNumber))
                        }
                      />
                      {errors.length > 0 ? <FieldError>{errors[0]}</FieldError> : null}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="endTime">
                {(field) => {
                  const errors = getFieldErrorMessages(field);

                  return (
                    <Field data-invalid={errors.length > 0}>
                      <FieldLabel htmlFor="template-end-time">Окончание</FieldLabel>
                      <Input
                        id="template-end-time"
                        type="time"
                        value={getTimeInputValue(field.state.value)}
                        aria-invalid={errors.length > 0 || undefined}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(getMinutesFromTimeInput(event.currentTarget.valueAsNumber))
                        }
                      />
                      {errors.length > 0 ? <FieldError>{errors[0]}</FieldError> : null}
                    </Field>
                  );
                }}
              </form.Field>
            </div>

            <form.Field name="type">
              {(field) => {
                const errors = getFieldErrorMessages(field);
                return (
                  <Field data-invalid={errors.length > 0}>
                    <FieldLabel htmlFor="template-type">Тип</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        field.handleChange(value as TeacherAvailabilityTemplateEditorInput["type"]);
                        field.handleBlur();
                      }}
                    >
                      <SelectTrigger
                        id="template-type"
                        className="w-full"
                        aria-invalid={errors.length > 0 || undefined}
                      >
                        <SelectValue>{AVAILABILITY_TYPE_LABELS[field.state.value]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {Object.entries(AVAILABILITY_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {errors.length > 0 ? <FieldError>{errors[0]}</FieldError> : null}
                  </Field>
                );
              }}
            </form.Field>

            {submitError ? <FieldError>{submitError}</FieldError> : null}
          </FieldGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
              Отмена
            </Button>
            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting || isSaving}>
                  {entry ? "Сохранить" : "Добавить"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
