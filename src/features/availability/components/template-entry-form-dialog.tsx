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
  TeacherAvailabilityEntryInput,
  TeacherAvailabilityTemplateEditorInput,
} from "@/features/availability/lib/schemas";
import { teacherAvailabilityTemplateEditorSchema } from "@/features/availability/lib/schemas";
import type { AvailabilityTemplateEntry } from "@/features/availability/lib/types";
import { AVAILABILITY_TYPE_LABELS, DAY_CONFIG, minutesToTime } from "@/features/availability/lib/utils";

const DAY_LABELS_BY_VALUE = new Map(DAY_CONFIG.map((day) => [String(day.dayOfWeek), day.label]));

export function TemplateEntryFormDialog({
  open,
  teacherName,
  entry,
  initialValues,
  allowErase,
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
  allowErase: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    entry: TeacherAvailabilityEntryInput | TeacherAvailabilityTemplateEditorInput,
    previousId?: string,
  ) => Promise<boolean>;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const defaultValues: TeacherAvailabilityTemplateEditorInput = {
    dayOfWeek: entry?.dayOfWeek ?? initialValues?.dayOfWeek ?? 1,
    startTime: entry?.startTime ?? initialValues?.startTime ?? 8 * 60,
    endTime: entry?.endTime ?? initialValues?.endTime ?? 9 * 60,
    type: entry?.type ?? "AVAILABLE",
  };
  const form = useForm({
    defaultValues,
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
  const typeLabels: Record<TeacherAvailabilityTemplateEditorInput["type"], string> = {
    PREFERRED: AVAILABILITY_TYPE_LABELS.PREFERRED,
    AVAILABLE: AVAILABILITY_TYPE_LABELS.AVAILABLE,
    UNAVAILABLE: AVAILABILITY_TYPE_LABELS.UNAVAILABLE,
    ERASE: "Стереть",
  };

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
              {allowErase ? " Значение `Стереть` удаляет текущий интервал целиком." : ""}
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
                        value={minutesToTime(field.state.value)}
                        aria-invalid={errors.length > 0 || undefined}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.valueAsNumber / 1000 / 60)}
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
                        value={minutesToTime(field.state.value)}
                        aria-invalid={errors.length > 0 || undefined}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.valueAsNumber / 1000 / 60)}
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
                        <SelectValue>{typeLabels[field.state.value]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {Object.entries(typeLabels)
                            .filter(([value]) => allowErase || value !== "ERASE")
                            .map(([value, label]) => (
                              <SelectItem
                                key={value}
                                value={value}
                                disabled={value === "ERASE" && (!allowErase || !entry)}
                              >
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
