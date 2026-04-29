import { useState } from "react";
import { format } from "date-fns";
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
import {
  mapOverrideEditorToActionInput,
  teacherAvailabilityOverrideEditorSchema,
  type TeacherAvailabilityOverrideEditorInput,
  type CreateTeacherAvailabilityOverrideInput,
  type UpdateTeacherAvailabilityOverrideInput,
} from "@/features/availability/lib/schemas";
import type { AvailabilityOverrideEntry } from "@/features/availability/lib/types";
import {
  AVAILABILITY_TYPE_LABELS,
  getAvailabilityDateFieldError,
  getAvailabilityTimeFieldError,
  getMinutesFromTimeInput,
  getTimeInputValue,
  hasAvailabilityDateErrors,
  hasAvailabilityTimeErrors,
} from "@/features/availability/lib/utils";

export function OverrideEntryFormDialog({
  open,
  teacherName,
  entry,
  initialValues,
  isSaving,
  onOpenChange,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  teacherName: string;
  entry: AvailabilityOverrideEntry | null;
  initialValues?: { date?: Date; startTime?: number; endTime?: number };
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (
    payload: Pick<CreateTeacherAvailabilityOverrideInput, "startTime" | "endTime" | "type">,
  ) => Promise<boolean>;
  onUpdate: (
    payload: Pick<UpdateTeacherAvailabilityOverrideInput, "overrideId" | "startTime" | "endTime" | "type">,
  ) => Promise<boolean>;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initialDate = entry?.startTime ?? initialValues?.date ?? new Date();
  const initialEndDate = entry?.endTime ?? initialValues?.date ?? new Date();
  const initialStartTime = entry
    ? entry.startTime.getHours() * 60 + entry.startTime.getMinutes()
    : initialValues?.startTime ?? 8 * 60;
  const initialEndTime = entry
    ? entry.endTime.getHours() * 60 + entry.endTime.getMinutes()
    : initialValues?.endTime ?? 9 * 60;
  const form = useForm({
    defaultValues: {
      startDate: format(initialDate, "yyyy-MM-dd"),
      endDate: format(initialEndDate, "yyyy-MM-dd"),
      startTime: initialStartTime,
      endTime: initialEndTime,
      type: entry?.type ?? "UNAVAILABLE",
    } satisfies TeacherAvailabilityOverrideEditorInput,
    validators: {
      onChange: teacherAvailabilityOverrideEditorSchema,
      onSubmit: teacherAvailabilityOverrideEditorSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);

      if (hasAvailabilityDateErrors(value) || hasAvailabilityTimeErrors(value)) {
        return;
      }

      const payload = mapOverrideEditorToActionInput(value);
      const success = entry
        ? await onUpdate({ ...payload, overrideId: entry.id })
        : await onCreate(payload);

      if (!success) {
        setSubmitError("Не удалось сохранить исключение");
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
            <DialogTitle>{entry ? "Изменить исключение" : "Добавить исключение"}</DialogTitle>
            <DialogDescription>
              {teacherName}. Исключение перекроет недельный шаблон в указанном диапазоне дат и
              времени.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="startDate">
                {(field) => (
                  <form.Subscribe selector={(state) => state.values}>
                    {(values) => {
                      const error = getAvailabilityDateFieldError("startDate", values);

                      return (
                        <Field data-invalid={Boolean(error)}>
                          <FieldLabel htmlFor="override-start-date">Дата начала</FieldLabel>
                          <Input
                            id="override-start-date"
                            type="date"
                            value={field.state.value}
                            aria-invalid={Boolean(error) || undefined}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.currentTarget.value)}
                          />
                          {error ? <FieldError>{error}</FieldError> : null}
                        </Field>
                      );
                    }}
                  </form.Subscribe>
                )}
              </form.Field>

              <form.Field name="endDate">
                {(field) => (
                  <form.Subscribe selector={(state) => state.values}>
                    {(values) => {
                      const error = getAvailabilityDateFieldError("endDate", values);

                      return (
                        <Field data-invalid={Boolean(error)}>
                          <FieldLabel htmlFor="override-end-date">Дата окончания</FieldLabel>
                          <Input
                            id="override-end-date"
                            type="date"
                            value={field.state.value}
                            aria-invalid={Boolean(error) || undefined}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.currentTarget.value)}
                          />
                          {error ? <FieldError>{error}</FieldError> : null}
                        </Field>
                      );
                    }}
                  </form.Subscribe>
                )}
              </form.Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="startTime">
                {(field) => (
                  <form.Subscribe selector={(state) => state.values}>
                    {(values) => {
                      const error = getAvailabilityTimeFieldError("startTime", values);

                      return (
                        <Field data-invalid={Boolean(error)}>
                          <FieldLabel htmlFor="override-start-time">Время начала</FieldLabel>
                          <Input
                            id="override-start-time"
                            type="time"
                            value={getTimeInputValue(field.state.value)}
                            aria-invalid={Boolean(error) || undefined}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(getMinutesFromTimeInput(event.currentTarget.valueAsNumber))
                            }
                          />
                          {error ? <FieldError>{error}</FieldError> : null}
                        </Field>
                      );
                    }}
                  </form.Subscribe>
                )}
              </form.Field>

              <form.Field name="endTime">
                {(field) => (
                  <form.Subscribe selector={(state) => state.values}>
                    {(values) => {
                      const error = getAvailabilityTimeFieldError("endTime", values);

                      return (
                        <Field data-invalid={Boolean(error)}>
                          <FieldLabel htmlFor="override-end-time">Время окончания</FieldLabel>
                          <Input
                            id="override-end-time"
                            type="time"
                            value={getTimeInputValue(field.state.value)}
                            aria-invalid={Boolean(error) || undefined}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(getMinutesFromTimeInput(event.currentTarget.valueAsNumber))
                            }
                          />
                          {error ? <FieldError>{error}</FieldError> : null}
                        </Field>
                      );
                    }}
                  </form.Subscribe>
                )}
              </form.Field>
            </div>

            <form.Field name="type">
              {(field) => {
                const errors = getFieldErrorMessages(field);
                return (
                  <Field data-invalid={errors.length > 0}>
                    <FieldLabel htmlFor="override-type">Тип</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        field.handleChange(value as TeacherAvailabilityOverrideEditorInput["type"]);
                        field.handleBlur();
                      }}
                    >
                      <SelectTrigger
                        id="override-type"
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
                hasLocalErrors: hasAvailabilityDateErrors(state.values) || hasAvailabilityTimeErrors(state.values),
              })}
            >
              {({ canSubmit, isSubmitting, hasLocalErrors }) => (
                <Button type="submit" disabled={!canSubmit || hasLocalErrors || isSubmitting || isSaving}>
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
