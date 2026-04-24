import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { CalendarDays, PencilLine, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
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
  TeacherAvailabilityEntry,
  TeacherAvailabilitySelf,
} from "../_lib/types";
import {
  teacherAvailabilityTemplateEditorSchema,
  type TeacherAvailabilityTemplateEditorInput,
} from "../_lib/schemas";
import {
  AVAILABILITY_TYPE_BADGE_VARIANTS,
  AVAILABILITY_TYPE_LABELS,
  DAY_CONFIG,
  formatTimeRange,
  minutesToTime,
} from "@/features/availability/lib/utils";

const DAY_LABELS_BY_VALUE = new Map(DAY_CONFIG.map((day) => [String(day.dayOfWeek), day.label]));
const EDITOR_TYPE_LABELS = {
  PREFERRED: AVAILABILITY_TYPE_LABELS.PREFERRED,
  AVAILABLE: AVAILABILITY_TYPE_LABELS.AVAILABLE,
  UNAVAILABLE: AVAILABILITY_TYPE_LABELS.UNAVAILABLE,
  ERASE: "Стереть",
} as const;

export type TemplateDialogState = {
  open: boolean;
  entry: TeacherAvailabilityEntry | null;
  draftDayOfWeek?: number;
  draftStartTime?: number;
  draftEndTime?: number;
};

type TeacherAvailabilityTemplateEditorProps = {
  teacher: TeacherAvailabilitySelf;
  dialog: TemplateDialogState;
  isSaving: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (entry: TeacherAvailabilityEntry) => void;
  onDeleteEntry: (entry: TeacherAvailabilityEntry) => void;
  onDialogChange: (open: boolean) => void;
  onSubmit: (entry: TeacherAvailabilityTemplateEditorInput, previousId?: string) => Promise<boolean>;
};

export function TeacherAvailabilityTemplateEditor({
  teacher,
  dialog,
  isSaving,
  onOpenCreate,
  onOpenEdit,
  onDeleteEntry,
  onDialogChange,
  onSubmit,
}: TeacherAvailabilityTemplateEditorProps) {
  const dayLabelsByDayOfWeek = useMemo(
    () => new Map(DAY_CONFIG.map((day) => [day.dayOfWeek, day.label])),
    [],
  );
  const templateGroups = (["PREFERRED", "AVAILABLE", "UNAVAILABLE"] as const).map((type) => ({
    type,
    label: AVAILABILITY_TYPE_LABELS[type],
    entries: teacher.templateEntries
      .filter((entry) => entry.type === type)
      .slice()
      .sort((left, right) =>
        left.dayOfWeek !== right.dayOfWeek
          ? left.dayOfWeek - right.dayOfWeek
          : left.startTime - right.startTime,
      ),
  }));

  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Шаблон недели</CardTitle>
          <CardDescription>
            Отмечайте, когда вы обычно можете работать каждую неделю.
          </CardDescription>
          <CardAction>
            <Button variant="default" size="sm" disabled={isSaving} onClick={onOpenCreate}>
              <Plus data-icon="inline-start" />
              Добавить интервал
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {teacher.templateEntries.length === 0 ? (
            <FilterableEmptyState
              hasFilters={false}
              empty={{
                icon: <CalendarDays />,
                title: "Вы еще не указали регулярную доступность",
                description: "Начните с превью недели: добавьте обычные интервалы доступности.",
                className: "min-h-72 py-8",
              }}
            />
          ) : (
            templateGroups.map((group) => (
              <div key={group.type} className="rounded-xl bg-background">
                <div className="border-b py-2">
                  <Badge variant={AVAILABILITY_TYPE_BADGE_VARIANTS[group.type]}>{group.label}</Badge>
                </div>
                <div className="flex flex-col gap-2 py-3">
                  {group.entries.length === 0 ? (
                    <div className="rounded-lg text-sm text-muted-foreground">
                      Для этого типа интервалы пока не заданы.
                    </div>
                  ) : (
                    group.entries.map((entry) => (
                      <div
                        key={entry.id}
                        data-testid="teacher-template-row"
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg"
                      >
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-medium text-foreground">
                            {dayLabelsByDayOfWeek.get(entry.dayOfWeek)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatTimeRange(entry.startTime, entry.endTime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSaving}
                            data-testid="teacher-template-edit"
                            onClick={() => onOpenEdit(entry)}
                          >
                            <PencilLine data-icon="inline-start" />
                            Изменить
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isSaving}
                            data-testid="teacher-template-delete"
                            onClick={() => void onDeleteEntry(entry)}
                          >
                            <Trash2 data-icon="inline-start" />
                            Удалить
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <TemplateEntryDialog
        key={`template-${dialog.entry?.id ?? "new"}-${dialog.open ? "open" : "closed"}-${dialog.draftDayOfWeek ?? "none"}-${dialog.draftStartTime ?? "none"}`}
        teacher={teacher}
        dialog={dialog}
        isSaving={isSaving}
        onOpenChange={onDialogChange}
        onSubmit={onSubmit}
      />
    </>
  );
}

type TemplateEntryDialogProps = {
  teacher: TeacherAvailabilitySelf;
  dialog: TemplateDialogState;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: TeacherAvailabilityTemplateEditorInput, previousId?: string) => Promise<boolean>;
};

function TemplateEntryDialog({
  teacher,
  dialog,
  isSaving,
  onOpenChange,
  onSubmit,
}: TemplateEntryDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initialValues: TeacherAvailabilityTemplateEditorInput = {
    dayOfWeek: dialog.entry?.dayOfWeek ?? dialog.draftDayOfWeek ?? 1,
    startTime: dialog.entry?.startTime ?? dialog.draftStartTime ?? 8 * 60,
    endTime: dialog.entry?.endTime ?? dialog.draftEndTime ?? 9 * 60,
    type: dialog.entry?.type ?? "AVAILABLE",
  };
  const form = useForm({
    defaultValues: initialValues,
    validators: {
      onChange: teacherAvailabilityTemplateEditorSchema,
      onSubmit: teacherAvailabilityTemplateEditorSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const success = await onSubmit(value, dialog.entry?.id);

      if (!success) {
        setSubmitError("Не удалось сохранить интервал");
      }
    },
  });

  return (
    <Dialog open={dialog.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{dialog.entry ? "Изменить интервал" : "Добавить интервал"}</DialogTitle>
            <DialogDescription>
              {teacher.fullName}. Новый слот будет встроен в недельный шаблон с нормализацией
              пересечений. Значение `Стереть` удаляет текущий интервал целиком.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <form.Field name="dayOfWeek">
              {(field) => {
                const errors = getFieldErrorMessages(field);
                return (
                  <Field data-invalid={errors.length > 0}>
                    <FieldLabel htmlFor="teacher-template-day">День недели</FieldLabel>
                    <Select
                      value={String(field.state.value)}
                      onValueChange={(value) => {
                        field.handleChange(Number(value));
                        field.handleBlur();
                      }}
                    >
                      <SelectTrigger
                        id="teacher-template-day"
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
                      <FieldLabel htmlFor="teacher-template-start-time">Начало</FieldLabel>
                      <Input
                        id="teacher-template-start-time"
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
                      <FieldLabel htmlFor="teacher-template-end-time">Окончание</FieldLabel>
                      <Input
                        id="teacher-template-end-time"
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
                    <FieldLabel htmlFor="teacher-template-type">Тип</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        field.handleChange(value as TeacherAvailabilityTemplateEditorInput["type"]);
                        field.handleBlur();
                      }}
                    >
                      <SelectTrigger
                        id="teacher-template-type"
                        className="w-full"
                        aria-invalid={errors.length > 0 || undefined}
                      >
                        <SelectValue>{EDITOR_TYPE_LABELS[field.state.value]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {Object.entries(EDITOR_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem
                              key={value}
                              value={value}
                              disabled={value === "ERASE" && !dialog.entry}
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
                  {dialog.entry ? "Сохранить" : "Добавить"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
