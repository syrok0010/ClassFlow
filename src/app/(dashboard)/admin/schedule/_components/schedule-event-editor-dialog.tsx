"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
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

type Option = { id: string; name: string };
type GroupOption = { id: string; name: string; type: string };

type ScheduleEditorFormValue = {
  dayOfWeek: number | null;
  startMinutes: number | null;
  subjectId: string;
  groupId: string;
  roomId: string | null;
  teacherId: string | null;
};

export type ScheduleEditorDraft = {
  templateId?: string;
  detached: boolean;
  dayOfWeek: number | null;
  startMinutes: number | null;
  endMinutes: number | null;
  subjectId: string;
  groupId: string;
  roomId: string | null;
  teacherId: string | null;
};

interface ScheduleEventEditorDialogProps {
  open: boolean;
  title: string;
  description: string;
  draft: ScheduleEditorDraft | null;
  subjectOptions: Option[];
  groupOptions: GroupOption[];
  roomOptions: Option[];
  teacherOptions: Option[];
  lessonDurationByGroupSubject: Record<string, number>;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: ScheduleEditorDraft) => Promise<void>;
}

const DAY_OPTIONS = [
  { value: "1", label: "Понедельник" },
  { value: "2", label: "Вторник" },
  { value: "3", label: "Среда" },
  { value: "4", label: "Четверг" },
  { value: "5", label: "Пятница" },
];

const NONE_VALUE = "none";

export function ScheduleEventEditorDialog({
  open,
  title,
  description,
  draft,
  subjectOptions,
  groupOptions,
  roomOptions,
  teacherOptions,
  lessonDurationByGroupSubject,
  onOpenChange,
  onSave,
}: ScheduleEventEditorDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      dayOfWeek: draft?.dayOfWeek ?? null,
      startMinutes: draft?.startMinutes ?? null,
      subjectId: draft?.subjectId ?? subjectOptions[0]?.id ?? "",
      groupId: draft?.groupId ?? groupOptions[0]?.id ?? "",
      roomId: draft?.roomId ?? null,
      teacherId: draft?.teacherId ?? null,
    } satisfies ScheduleEditorFormValue,
    onSubmit: async ({ value }) => {
      if (!draft) {
        return;
      }

      const duration = getLessonDurationMinutes(lessonDurationByGroupSubject, value.groupId, value.subjectId);
      if (duration === null) {
        setSubmitError("Для выбранных класса и предмета не задана длительность урока");
        return;
      }

      const detached = value.dayOfWeek === null || value.startMinutes === null;
      const startMinutes = value.startMinutes;
      const endMinutes = detached || startMinutes === null ? null : Math.min(24 * 60, startMinutes + duration);

      await onSave({
        templateId: draft.templateId,
        detached,
        dayOfWeek: detached ? null : value.dayOfWeek,
        startMinutes: detached ? null : startMinutes,
        endMinutes,
        subjectId: value.subjectId,
        groupId: value.groupId,
        roomId: value.roomId,
        teacherId: value.teacherId,
      });

      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setSubmitError(null);
    form.reset({
      dayOfWeek: draft?.dayOfWeek ?? null,
      startMinutes: draft?.startMinutes ?? null,
      subjectId: draft?.subjectId ?? subjectOptions[0]?.id ?? "",
      groupId: draft?.groupId ?? groupOptions[0]?.id ?? "",
      roomId: draft?.roomId ?? null,
      teacherId: draft?.teacherId ?? null,
    });
  }, [
    draft,
    form,
    groupOptions,
    open,
    roomOptions,
    subjectOptions,
    teacherOptions,
  ]);

  const selectedGroupId = form.state.values.groupId;
  const selectedSubjectId = form.state.values.subjectId;
  const selectedStartMinutes = form.state.values.startMinutes;
  const lessonDuration = useMemo(
    () => getLessonDurationMinutes(lessonDurationByGroupSubject, selectedGroupId, selectedSubjectId),
    [lessonDurationByGroupSubject, selectedGroupId, selectedSubjectId],
  );
  const computedEndMinutes =
    selectedStartMinutes !== null && lessonDuration !== null
      ? Math.min(24 * 60, selectedStartMinutes + lessonDuration)
      : null;

  if (!draft) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitError(null);
            void form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <form.Field name="dayOfWeek">
              {(field) => {
                const errors = getFieldErrorMessages(field);

                return (
                  <Field data-invalid={errors.length > 0}>
                    <FieldLabel htmlFor="schedule-editor-day">День</FieldLabel>
                    <Select
                      value={field.state.value === null ? NONE_VALUE : String(field.state.value)}
                      onValueChange={(value) => {
                        field.handleChange(value === NONE_VALUE ? null : Number(value));
                        field.handleBlur();
                      }}
                    >
                      <SelectTrigger
                        id="schedule-editor-day"
                        className="w-full"
                        aria-invalid={errors.length > 0 || undefined}
                      >
                        <SelectValue>
                          {field.state.value === null
                            ? "Без дня (временная зона)"
                            : DAY_OPTIONS.find((option) => Number(option.value) === field.state.value)?.label}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          <SelectItem value={NONE_VALUE}>Без дня (временная зона)</SelectItem>
                          {DAY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
              <form.Field name="startMinutes">
                {(field) => {
                  const errors = getFieldErrorMessages(field);
                  return (
                    <Field data-invalid={errors.length > 0}>
                      <FieldLabel htmlFor="schedule-editor-start-time">Время начала</FieldLabel>
                      <Input
                        id="schedule-editor-start-time"
                        type="time"
                        value={minutesToTime(field.state.value)}
                        aria-invalid={errors.length > 0 || undefined}
                        onBlur={field.handleBlur}
                        onChange={(event) => {
                          const nextMinutes = Number.isNaN(event.target.valueAsNumber)
                            ? null
                            : event.target.valueAsNumber / 1000 / 60;
                          field.handleChange(nextMinutes);
                        }}
                      />
                      {errors.length > 0 ? <FieldError>{errors[0]}</FieldError> : null}
                    </Field>
                  );
                }}
              </form.Field>

              <Field>
                <FieldLabel htmlFor="schedule-editor-end-time">Время окончания</FieldLabel>
                <Input
                  id="schedule-editor-end-time"
                  type="time"
                  value={minutesToTime(computedEndMinutes)}
                  disabled
                />
                <FieldDescription>
                  Рассчитывается автоматически по длительности предмета для выбранного класса.
                </FieldDescription>
              </Field>
            </div>

            <form.Field name="subjectId">
              {(field) => {
                const errors = getFieldErrorMessages(field);
                return (
                  <Field data-invalid={errors.length > 0}>
                    <FieldLabel htmlFor="schedule-editor-subject">Предмет</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        field.handleChange(value ?? field.state.value);
                        field.handleBlur();
                      }}
                    >
                      <SelectTrigger
                        id="schedule-editor-subject"
                        className="w-full"
                        aria-invalid={errors.length > 0 || undefined}
                      >
                        <SelectValue>
                          {subjectOptions.find((option) => option.id === field.state.value)?.name ?? "Предмет"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {subjectOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
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

            <form.Field name="groupId">
              {(field) => {
                const errors = getFieldErrorMessages(field);
                return (
                  <Field data-invalid={errors.length > 0}>
                    <FieldLabel htmlFor="schedule-editor-group">Класс/подгруппа/кружок</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        field.handleChange(value ?? field.state.value);
                        field.handleBlur();
                      }}
                    >
                      <SelectTrigger
                        id="schedule-editor-group"
                        className="w-full"
                        aria-invalid={errors.length > 0 || undefined}
                      >
                        <SelectValue>
                          {groupOptions.find((option) => option.id === field.state.value)?.name
                            ?? "Класс/подгруппа/кружок"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {groupOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
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

            <Field>
              <FieldLabel htmlFor="schedule-editor-duration">Длительность урока</FieldLabel>
              <Input
                id="schedule-editor-duration"
                value={lessonDuration !== null ? `${lessonDuration} мин` : "Не задана"}
                disabled
              />
            </Field>

            <form.Field name="roomId">
              {(field) => {
                const errors = getFieldErrorMessages(field);
                return (
                  <Field data-invalid={errors.length > 0}>
                    <FieldLabel htmlFor="schedule-editor-room">Кабинет</FieldLabel>
                    <Select
                      value={field.state.value ?? NONE_VALUE}
                      onValueChange={(value) => {
                        field.handleChange(value === NONE_VALUE ? null : value);
                        field.handleBlur();
                      }}
                    >
                      <SelectTrigger
                        id="schedule-editor-room"
                        className="w-full"
                        aria-invalid={errors.length > 0 || undefined}
                      >
                        <SelectValue>
                          {field.state.value
                            ? roomOptions.find((option) => option.id === field.state.value)?.name ?? "Кабинет"
                            : "Без кабинета"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          <SelectItem value={NONE_VALUE}>Без кабинета</SelectItem>
                          {roomOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
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

            <form.Field name="teacherId">
              {(field) => {
                const errors = getFieldErrorMessages(field);
                return (
                  <Field data-invalid={errors.length > 0}>
                    <FieldLabel htmlFor="schedule-editor-teacher">Учитель</FieldLabel>
                    <Select
                      value={field.state.value ?? NONE_VALUE}
                      onValueChange={(value) => {
                        field.handleChange(value === NONE_VALUE ? null : value);
                        field.handleBlur();
                      }}
                    >
                      <SelectTrigger
                        id="schedule-editor-teacher"
                        className="w-full"
                        aria-invalid={errors.length > 0 || undefined}
                      >
                        <SelectValue>
                          {field.state.value
                            ? teacherOptions.find((option) => option.id === field.state.value)?.name ?? "Учитель"
                            : "Без учителя"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          <SelectItem value={NONE_VALUE}>Без учителя</SelectItem>
                          {teacherOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
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
                <Button
                  type="submit"
                  disabled={!canSubmit || isSubmitting || (!form.state.values.dayOfWeek ? false : lessonDuration === null)}
                >
                  Сохранить
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getLessonDurationMinutes(
  lessonDurationByGroupSubject: Record<string, number>,
  groupId: string,
  subjectId: string,
) {
  const key = `${groupId}:${subjectId}`;
  return lessonDurationByGroupSubject[key] ?? null;
}

function minutesToTime(totalMinutes: number | null) {
  if (totalMinutes === null || Number.isNaN(totalMinutes)) {
    return "";
  }

  const safeMinutes = Math.max(0, Math.min(24 * 60, Math.round(totalMinutes)));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
