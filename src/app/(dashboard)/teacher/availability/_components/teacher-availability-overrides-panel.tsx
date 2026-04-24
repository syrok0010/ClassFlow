import { format } from "date-fns";
import { useState } from "react";
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
import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  TeacherAvailabilityOverride,
  TeacherAvailabilitySelf,
} from "../_lib/types";
import {
  mapOverrideEditorToActionInput,
  teacherAvailabilityOverrideEditorSchema,
  type CreateTeacherAvailabilityOverrideActionInput,
  type TeacherAvailabilityOverrideEditorInput,
  type UpdateTeacherAvailabilityOverrideActionInput,
} from "../_lib/schemas";
import {
  AVAILABILITY_TYPE_BADGE_VARIANTS,
  AVAILABILITY_TYPE_LABELS,
  formatDateRange,
  formatTimeRange,
  getTeacherOverrideEntriesForWeek,
  minutesToTime,
} from "@/features/availability/lib/utils";

export type OverrideDialogState = {
  open: boolean;
  entry: TeacherAvailabilityOverride | null;
  draftDate?: Date;
  draftStartTime?: number;
  draftEndTime?: number;
};

type TeacherAvailabilityOverridesPanelProps = {
  teacher: TeacherAvailabilitySelf;
  weekStart: Date;
  dialog: OverrideDialogState;
  selectedOverrideId: string | null;
  overrideToDelete: TeacherAvailabilityOverride | null;
  isSaving: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (entry: TeacherAvailabilityOverride) => void;
  onSelectOverride: (overrideId: string | null) => void;
  onRequestDelete: (entry: TeacherAvailabilityOverride | null) => void;
  onDialogChange: (open: boolean) => void;
  onDeleteDialogChange: (open: boolean) => void;
  onCreate: (payload: CreateTeacherAvailabilityOverrideActionInput) => Promise<boolean>;
  onUpdate: (payload: UpdateTeacherAvailabilityOverrideActionInput) => Promise<boolean>;
  onDelete: () => void;
};

export function TeacherAvailabilityOverridesPanel({
  teacher,
  weekStart,
  dialog,
  selectedOverrideId,
  overrideToDelete,
  isSaving,
  onOpenCreate,
  onOpenEdit,
  onSelectOverride,
  onRequestDelete,
  onDialogChange,
  onDeleteDialogChange,
  onCreate,
  onUpdate,
  onDelete,
}: TeacherAvailabilityOverridesPanelProps) {
  const weekOverrideIds = new Set(
    getTeacherOverrideEntriesForWeek(teacher, weekStart).map((override) => override.id),
  );

  return (
    <>
      <Card className="h-full">
        <CardHeader className="border-b">
          <CardTitle>Исключения</CardTitle>
          <CardDescription>
            Разовые изменения поверх шаблона. В списке показана вся история override.
          </CardDescription>
          <CardAction>
            <Button variant="default" size="sm" disabled={isSaving} onClick={onOpenCreate}>
              <Plus data-icon="inline-start" />
              Добавить исключение
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {teacher.overrides.length === 0 ? (
            <FilterableEmptyState
              hasFilters={false}
              empty={{
                icon: <CalendarDays />,
                title: "У вас нет разовых исключений",
                description:
                  "Добавляйте исключения для больничных, отпусков, переносов и дополнительных окон.",
                className: "min-h-80 py-8",
              }}
            />
          ) : (
            teacher.overrides.map((entry) => (
              <div
                key={entry.id}
                data-testid="teacher-override-row"
                role="button"
                tabIndex={0}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  selectedOverrideId === entry.id
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-background hover:border-border"
                }`}
                onClick={() => onSelectOverride(selectedOverrideId === entry.id ? null : entry.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectOverride(selectedOverrideId === entry.id ? null : entry.id);
                  }
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={AVAILABILITY_TYPE_BADGE_VARIANTS[entry.type]}>
                        {AVAILABILITY_TYPE_LABELS[entry.type]}
                      </Badge>
                      {weekOverrideIds.has(entry.id) ? (
                        <Badge variant="outline">Текущая неделя</Badge>
                      ) : null}
                    </div>
                    <p className="font-medium text-foreground">
                      {formatDateRange(entry.startTime, entry.endTime)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatTimeRange(
                        entry.startTime.getHours() * 60 + entry.startTime.getMinutes(),
                        entry.endTime.getHours() * 60 + entry.endTime.getMinutes(),
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      data-testid="teacher-override-edit"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenEdit(entry);
                      }}
                    >
                      <PencilLine data-icon="inline-start" />
                      Изменить
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isSaving}
                      data-testid="teacher-override-delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRequestDelete(entry);
                      }}
                    >
                      <Trash2 data-icon="inline-start" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <OverrideEntryDialog
        key={`override-${dialog.entry?.id ?? "new"}-${dialog.open ? "open" : "closed"}-${dialog.draftDate?.toISOString() ?? "none"}`}
        teacher={teacher}
        dialog={dialog}
        isSaving={isSaving}
        onOpenChange={onDialogChange}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />

      <AlertDialog open={Boolean(overrideToDelete)} onOpenChange={onDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить исключение?</AlertDialogTitle>
            <AlertDialogDescription>
              Исключение будет убрано из превью недели и из будущих расчётов расписания.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type OverrideEntryDialogProps = {
  teacher: TeacherAvailabilitySelf;
  dialog: OverrideDialogState;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: CreateTeacherAvailabilityOverrideActionInput) => Promise<boolean>;
  onUpdate: (payload: UpdateTeacherAvailabilityOverrideActionInput) => Promise<boolean>;
};

function OverrideEntryDialog({
  teacher,
  dialog,
  isSaving,
  onOpenChange,
  onCreate,
  onUpdate,
}: OverrideEntryDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initialDate = dialog.entry?.startTime ?? dialog.draftDate ?? new Date();
  const initialEndDate = dialog.entry?.endTime ?? dialog.draftDate ?? new Date();
  const initialStartTime = dialog.entry
    ? dialog.entry.startTime.getHours() * 60 + dialog.entry.startTime.getMinutes()
    : dialog.draftStartTime ?? 8 * 60;
  const initialEndTime = dialog.entry
    ? dialog.entry.endTime.getHours() * 60 + dialog.entry.endTime.getMinutes()
    : dialog.draftEndTime ?? 9 * 60;
  const form = useForm({
    defaultValues: {
      startDate: format(initialDate, "yyyy-MM-dd"),
      endDate: format(initialEndDate, "yyyy-MM-dd"),
      startTime: initialStartTime,
      endTime: initialEndTime,
      type: dialog.entry?.type ?? "UNAVAILABLE",
    } satisfies TeacherAvailabilityOverrideEditorInput,
    validators: {
      onChange: teacherAvailabilityOverrideEditorSchema,
      onSubmit: teacherAvailabilityOverrideEditorSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const payload = mapOverrideEditorToActionInput(value);
      const success = dialog.entry
        ? await onUpdate({ ...payload, overrideId: dialog.entry.id })
        : await onCreate(payload);

      if (!success) {
        setSubmitError("Не удалось сохранить исключение");
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
            <DialogTitle>{dialog.entry ? "Изменить исключение" : "Добавить исключение"}</DialogTitle>
            <DialogDescription>
              {teacher.fullName}. Исключение переопределяет недельный шаблон на выбранную дату
              или диапазон дат.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="startDate">
                {(field) => {
                  const errors = getFieldErrorMessages(field);
                  return (
                    <Field data-invalid={errors.length > 0}>
                      <FieldLabel htmlFor="teacher-override-start-date">Дата начала</FieldLabel>
                      <Input
                        id="teacher-override-start-date"
                        type="date"
                        value={field.state.value}
                        aria-invalid={errors.length > 0 || undefined}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                      {errors.length > 0 ? <FieldError>{errors[0]}</FieldError> : null}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="endDate">
                {(field) => {
                  const errors = getFieldErrorMessages(field);
                  return (
                    <Field data-invalid={errors.length > 0}>
                      <FieldLabel htmlFor="teacher-override-end-date">Дата окончания</FieldLabel>
                      <Input
                        id="teacher-override-end-date"
                        type="date"
                        value={field.state.value}
                        aria-invalid={errors.length > 0 || undefined}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                      {errors.length > 0 ? <FieldError>{errors[0]}</FieldError> : null}
                    </Field>
                  );
                }}
              </form.Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field name="startTime">
                {(field) => {
                  const errors = getFieldErrorMessages(field);
                  return (
                    <Field data-invalid={errors.length > 0}>
                      <FieldLabel htmlFor="teacher-override-start-time">Время начала</FieldLabel>
                      <Input
                        id="teacher-override-start-time"
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
                      <FieldLabel htmlFor="teacher-override-end-time">Время окончания</FieldLabel>
                      <Input
                        id="teacher-override-end-time"
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
                    <FieldLabel htmlFor="teacher-override-type">Тип</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        field.handleChange(value as TeacherAvailabilityOverrideEditorInput["type"]);
                        field.handleBlur();
                      }}
                    >
                      <SelectTrigger
                        id="teacher-override-type"
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
