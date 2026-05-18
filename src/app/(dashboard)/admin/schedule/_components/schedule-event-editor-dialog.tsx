"use client";

import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";

import type { GroupType, ScheduleDeliveryMode, SubjectType } from "@/generated/prisma/enums";
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

import { ScheduleMultiSelect, type FilterOption } from "./schedule-multi-select";

type SubjectOption = { id: string; name: string; type: SubjectType };
type DirectGroupOption = { id: string; name: string; type: GroupType; subjectId: string | null };
type ElectiveGroupOption = { id: string; name: string; subjectId: string | null };

type ScheduleEditorFormValue = {
  dayOfWeek: number | null;
  startMinutes: number | null;
  endMinutes: number | null;
  subjectId: string;
  deliveryMode: ScheduleDeliveryMode;
  deliveryGroupId: string | null;
  roomId: string | null;
  teacherId: string | null;
  openClassIds: string[];
  coveredClassIds: string[];
};

export type ScheduleEditorDraft = {
  templateId?: string;
  dayOfWeek: number | null;
  startMinutes: number | null;
  endMinutes: number | null;
  subjectId: string;
  deliveryMode: ScheduleDeliveryMode;
  deliveryGroupId: string | null;
  roomId: string | null;
  teacherId: string | null;
  openClassIds: string[];
  coveredClassIds: string[];
};

interface ScheduleEventEditorDialogProps {
  open: boolean;
  title: string;
  description: string;
  draft: ScheduleEditorDraft | null;
  subjectOptions: SubjectOption[];
  classOptions: FilterOption[];
  directGroupOptions: DirectGroupOption[];
  electiveGroupOptions: ElectiveGroupOption[];
  roomOptions: { id: string; name: string }[];
  teacherOptions: { id: string; name: string }[];
  lessonDurationByGroupSubject: Record<string, number>;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: ScheduleEditorDraft) => Promise<void>;
}

interface ScheduleEventEditorDialogContentProps extends Omit<ScheduleEventEditorDialogProps, "draft"> {
  draft: ScheduleEditorDraft;
  initialValues: ScheduleEditorFormValue;
}

const DAY_OPTIONS = [
  { value: "1", label: "Понедельник" },
  { value: "2", label: "Вторник" },
  { value: "3", label: "Среда" },
  { value: "4", label: "Четверг" },
  { value: "5", label: "Пятница" },
];

const DELIVERY_MODE_OPTIONS: Array<{ value: ScheduleDeliveryMode; label: string }> = [
  { value: "DIRECT_GROUP", label: "Группа" },
  { value: "ELECTIVE_GROUP", label: "Доп по выбору" },
  { value: "SHARED_CLASSES", label: "Общий слот классов" },
];

const NONE_VALUE = "none";

export function ScheduleEventEditorDialog({
  open,
  title,
  description,
  draft,
  subjectOptions,
  classOptions,
  directGroupOptions,
  electiveGroupOptions,
  roomOptions,
  teacherOptions,
  lessonDurationByGroupSubject,
  onOpenChange,
  onSave,
}: ScheduleEventEditorDialogProps) {
  const initialValues = useMemo(
    () => buildDefaultValues(draft, subjectOptions, classOptions, directGroupOptions, electiveGroupOptions),
    [draft, subjectOptions, classOptions, directGroupOptions, electiveGroupOptions],
  );

  if (!draft) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <ScheduleEventEditorDialogContent
          key={JSON.stringify(initialValues)}
          open={open}
          title={title}
          description={description}
          draft={draft}
          initialValues={initialValues}
          subjectOptions={subjectOptions}
          classOptions={classOptions}
          directGroupOptions={directGroupOptions}
          electiveGroupOptions={electiveGroupOptions}
          roomOptions={roomOptions}
          teacherOptions={teacherOptions}
          lessonDurationByGroupSubject={lessonDurationByGroupSubject}
          onOpenChange={onOpenChange}
          onSave={onSave}
        />
      ) : null}
    </Dialog>
  );
}

function ScheduleEventEditorDialogContent({
  title,
  description,
  draft,
  initialValues,
  subjectOptions,
  classOptions,
  directGroupOptions,
  electiveGroupOptions,
  roomOptions,
  teacherOptions,
  lessonDurationByGroupSubject,
  onOpenChange,
  onSave,
}: ScheduleEventEditorDialogContentProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: initialValues satisfies ScheduleEditorFormValue,
    onSubmit: async ({ value }) => {
      const validationError = validateScheduleEditorValue(value);
      if (validationError) {
        setSubmitError(validationError);
        return;
      }

      await onSave({
        templateId: draft.templateId,
        dayOfWeek: value.dayOfWeek,
        startMinutes: value.startMinutes,
        endMinutes: value.endMinutes,
        subjectId: value.subjectId,
        deliveryMode: value.deliveryMode,
        deliveryGroupId: value.deliveryGroupId,
        roomId: value.roomId,
        teacherId: value.teacherId,
        openClassIds: value.openClassIds,
        coveredClassIds: value.coveredClassIds,
      });

      onOpenChange(false);
    },
  });

  const deliveryMode = form.state.values.deliveryMode;
  const selectedSubjectId = form.state.values.subjectId;
  const selectedDeliveryGroupId = form.state.values.deliveryGroupId;
  const selectedCoveredClassIds = form.state.values.coveredClassIds;

  const filteredSubjectOptions = useMemo(
    () => getSubjectOptionsForMode(subjectOptions, deliveryMode),
    [subjectOptions, deliveryMode],
  );

  const durationHint = useMemo(
    () =>
      getDurationHint({
        deliveryMode,
        subjectId: selectedSubjectId,
        deliveryGroupId: selectedDeliveryGroupId,
        coveredClassIds: selectedCoveredClassIds,
        lessonDurationByGroupSubject,
      }),
    [
      deliveryMode,
      selectedSubjectId,
      selectedDeliveryGroupId,
      selectedCoveredClassIds,
      lessonDurationByGroupSubject,
    ],
  );

  return (
    <DialogContent className="sm:max-w-2xl">
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
            <form.Field name="deliveryMode">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="schedule-editor-mode">Тип карточки</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => {
                      const nextMode = (value ?? field.state.value) as ScheduleDeliveryMode;
                      field.handleChange(nextMode);
                      field.handleBlur();

                      if (nextMode === "DIRECT_GROUP") {
                        form.setFieldValue("deliveryGroupId", directGroupOptions[0]?.id ?? null);
                        form.setFieldValue("openClassIds", []);
                        form.setFieldValue("coveredClassIds", []);
                        const nextSubject = getSubjectOptionsForMode(subjectOptions, nextMode)[0]?.id ?? "";
                        form.setFieldValue("subjectId", nextSubject);
                      } else if (nextMode === "ELECTIVE_GROUP") {
                        const nextGroup = electiveGroupOptions[0] ?? null;
                        form.setFieldValue("deliveryGroupId", nextGroup?.id ?? null);
                        form.setFieldValue("openClassIds", classOptions[0] ? [classOptions[0].id] : []);
                        form.setFieldValue("coveredClassIds", []);
                        form.setFieldValue("subjectId", nextGroup?.subjectId ?? "");
                      } else {
                        form.setFieldValue("deliveryGroupId", null);
                        form.setFieldValue("openClassIds", []);
                        form.setFieldValue("coveredClassIds", classOptions.slice(0, 2).map((item) => item.id));
                        const nextSubject = getSubjectOptionsForMode(subjectOptions, nextMode)[0]?.id ?? "";
                        form.setFieldValue("subjectId", nextSubject);
                      }
                    }}
                  >
                    <SelectTrigger id="schedule-editor-mode" className="w-full">
                      <SelectValue>
                        {DELIVERY_MODE_OPTIONS.find((option) => option.value === field.state.value)?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {DELIVERY_MODE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

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
                            ? "Без дня (временная область)"
                            : DAY_OPTIONS.find((option) => Number(option.value) === field.state.value)?.label}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          <SelectItem value={NONE_VALUE}>Без дня (временная область)</SelectItem>
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
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="schedule-editor-start-time">Время начала</FieldLabel>
                    <Input
                      id="schedule-editor-start-time"
                      type="time"
                      value={minutesToTime(field.state.value)}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        const nextMinutes = Number.isNaN(event.target.valueAsNumber)
                          ? null
                          : event.target.valueAsNumber / 1000 / 60;
                        field.handleChange(nextMinutes);
                      }}
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field name="endMinutes">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="schedule-editor-end-time">Время окончания</FieldLabel>
                    <Input
                      id="schedule-editor-end-time"
                      type="time"
                      value={minutesToTime(field.state.value)}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        const nextMinutes = Number.isNaN(event.target.valueAsNumber)
                          ? null
                          : event.target.valueAsNumber / 1000 / 60;
                        field.handleChange(nextMinutes);
                      }}
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            {deliveryMode === "DIRECT_GROUP" ? (
              <form.Field name="deliveryGroupId">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="schedule-editor-direct-group">Группа</FieldLabel>
                    <Select
                      value={field.state.value ?? NONE_VALUE}
                      onValueChange={(value) => {
                        field.handleChange(value === NONE_VALUE ? null : value);
                        field.handleBlur();
                      }}
                    >
                      <SelectTrigger id="schedule-editor-direct-group" className="w-full">
                        <SelectValue>
                          {field.state.value
                            ? directGroupOptions.find((option) => option.id === field.state.value)?.name ?? "Группа"
                            : "Группа"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {directGroupOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </form.Field>
            ) : null}

            {deliveryMode === "ELECTIVE_GROUP" ? (
              <>
                <form.Field name="deliveryGroupId">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor="schedule-editor-elective-group">Группа по выбору</FieldLabel>
                      <Select
                        value={field.state.value ?? NONE_VALUE}
                        onValueChange={(value) => {
                          const nextId = value === NONE_VALUE ? null : value;
                          field.handleChange(nextId);
                          field.handleBlur();
                          const nextGroup = electiveGroupOptions.find((option) => option.id === nextId);
                          form.setFieldValue("subjectId", nextGroup?.subjectId ?? "");
                        }}
                      >
                        <SelectTrigger id="schedule-editor-elective-group" className="w-full">
                          <SelectValue>
                            {field.state.value
                              ? electiveGroupOptions.find((option) => option.id === field.state.value)?.name ?? "Группа по выбору"
                              : "Группа по выбору"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="start">
                          <SelectGroup>
                            {electiveGroupOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </form.Field>

                <form.Field name="openClassIds">
                  {(field) => (
                    <Field>
                      <FieldLabel>Открыт для классов</FieldLabel>
                      <ScheduleMultiSelect
                        title="Классы"
                        options={classOptions}
                        selectedIds={field.state.value}
                        onChange={(next) => {
                          field.handleChange(next);
                          field.handleBlur();
                        }}
                      />
                    </Field>
                  )}
                </form.Field>
              </>
            ) : null}

            {deliveryMode === "SHARED_CLASSES" ? (
              <form.Field name="coveredClassIds">
                {(field) => (
                  <Field>
                    <FieldLabel>Покрываемые классы</FieldLabel>
                    <ScheduleMultiSelect
                      title="Классы"
                      options={classOptions}
                      selectedIds={field.state.value}
                      onChange={(next) => {
                        field.handleChange(next);
                        field.handleBlur();
                      }}
                    />
                  </Field>
                )}
              </form.Field>
            ) : null}

            <form.Field name="subjectId">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="schedule-editor-subject">Предмет</FieldLabel>
                  <Select
                    value={field.state.value || NONE_VALUE}
                    onValueChange={(value) => {
                      field.handleChange(value && value !== NONE_VALUE ? value : "");
                      field.handleBlur();
                    }}
                    disabled={deliveryMode === "ELECTIVE_GROUP"}
                  >
                    <SelectTrigger id="schedule-editor-subject" className="w-full">
                      <SelectValue>
                        {field.state.value
                          ? filteredSubjectOptions.find((option) => option.id === field.state.value)?.name ?? "Предмет"
                          : "Предмет"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {filteredSubjectOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {deliveryMode === "ELECTIVE_GROUP" ? (
                    <FieldDescription>Предмет берется из выбранной группы по выбору.</FieldDescription>
                  ) : null}
                </Field>
              )}
            </form.Field>

            <Field>
              <FieldLabel htmlFor="schedule-editor-duration">Подсказка по длительности</FieldLabel>
              <Input
                id="schedule-editor-duration"
                value={formatDurationHint(durationHint)}
                disabled
              />
              <FieldDescription>
                Для режима и общих слотов время окончания можно задать вручную даже без совпадающего требования.
              </FieldDescription>
            </Field>

            <form.Field name="roomId">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="schedule-editor-room">Кабинет</FieldLabel>
                  <Select
                    value={field.state.value ?? NONE_VALUE}
                    onValueChange={(value) => {
                      field.handleChange(value === NONE_VALUE ? null : value);
                      field.handleBlur();
                    }}
                  >
                    <SelectTrigger id="schedule-editor-room" className="w-full">
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
                </Field>
              )}
            </form.Field>

            <form.Field name="teacherId">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="schedule-editor-teacher">Учитель</FieldLabel>
                  <Select
                    value={field.state.value ?? NONE_VALUE}
                    onValueChange={(value) => {
                      field.handleChange(value === NONE_VALUE ? null : value);
                      field.handleBlur();
                    }}
                  >
                    <SelectTrigger id="schedule-editor-teacher" className="w-full">
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
                </Field>
              )}
            </form.Field>

          {submitError ? <FieldError>{submitError}</FieldError> : null}
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Отмена
          </Button>
          <Button type="submit">
            Сохранить
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function buildDefaultValues(
  draft: ScheduleEditorDraft | null,
  subjectOptions: SubjectOption[],
  classOptions: FilterOption[],
  directGroupOptions: DirectGroupOption[],
  electiveGroupOptions: ElectiveGroupOption[],
): ScheduleEditorFormValue {
  const directSubjectOptions = getSubjectOptionsForMode(subjectOptions, "DIRECT_GROUP");
  const sharedSubjectOptions = getSubjectOptionsForMode(subjectOptions, "SHARED_CLASSES");
  const mode = draft?.deliveryMode ?? "DIRECT_GROUP";

  if (mode === "ELECTIVE_GROUP") {
    const fallbackElectiveGroup = electiveGroupOptions[0] ?? null;
    return {
      dayOfWeek: draft?.dayOfWeek ?? null,
      startMinutes: draft?.startMinutes ?? null,
      endMinutes: draft?.endMinutes ?? null,
      deliveryMode: mode,
      deliveryGroupId: draft?.deliveryGroupId ?? fallbackElectiveGroup?.id ?? null,
      subjectId: draft?.subjectId || fallbackElectiveGroup?.subjectId || "",
      roomId: draft?.roomId ?? null,
      teacherId: draft?.teacherId ?? null,
      openClassIds: draft?.openClassIds.length ? draft.openClassIds : (classOptions[0] ? [classOptions[0].id] : []),
      coveredClassIds: [],
    };
  }

  if (mode === "SHARED_CLASSES") {
    return {
      dayOfWeek: draft?.dayOfWeek ?? null,
      startMinutes: draft?.startMinutes ?? null,
      endMinutes: draft?.endMinutes ?? null,
      deliveryMode: mode,
      deliveryGroupId: null,
      subjectId: draft?.subjectId || sharedSubjectOptions[0]?.id || "",
      roomId: draft?.roomId ?? null,
      teacherId: draft?.teacherId ?? null,
      openClassIds: [],
      coveredClassIds: draft?.coveredClassIds.length ? draft.coveredClassIds : classOptions.slice(0, 2).map((item) => item.id),
    };
  }

  return {
    dayOfWeek: draft?.dayOfWeek ?? null,
    startMinutes: draft?.startMinutes ?? null,
    endMinutes: draft?.endMinutes ?? null,
    deliveryMode: "DIRECT_GROUP",
    deliveryGroupId: draft?.deliveryGroupId ?? directGroupOptions[0]?.id ?? null,
    subjectId: draft?.subjectId || directSubjectOptions[0]?.id || "",
    roomId: draft?.roomId ?? null,
    teacherId: draft?.teacherId ?? null,
    openClassIds: [],
    coveredClassIds: [],
  };
}

function getSubjectOptionsForMode(
  subjectOptions: SubjectOption[],
  deliveryMode: ScheduleDeliveryMode,
) {
  if (deliveryMode === "ELECTIVE_GROUP") {
    return subjectOptions.filter((option) => option.type === "ELECTIVE_OPTIONAL");
  }

  if (deliveryMode === "SHARED_CLASSES") {
    return subjectOptions.filter((option) => option.type === "ELECTIVE_REQUIRED" || option.type === "REGIME");
  }

  return subjectOptions.filter((option) => option.type !== "ELECTIVE_OPTIONAL");
}

function getDurationHint({
  deliveryMode,
  subjectId,
  deliveryGroupId,
  coveredClassIds,
  lessonDurationByGroupSubject,
}: {
  deliveryMode: ScheduleDeliveryMode;
  subjectId: string;
  deliveryGroupId: string | null;
  coveredClassIds: string[];
  lessonDurationByGroupSubject: Record<string, number>;
}) {
  if (!subjectId) {
    return { kind: "none" as const, minutes: null };
  }

  if (deliveryMode === "SHARED_CLASSES") {
    const durations = Array.from(
      new Set(
        coveredClassIds
          .map((classId) => lessonDurationByGroupSubject[`${classId}:${subjectId}`])
          .filter((duration): duration is number => typeof duration === "number"),
      ),
    );

    if (durations.length === 0) {
      return { kind: "none" as const, minutes: null };
    }

    if (durations.length > 1) {
      return { kind: "mismatch" as const, minutes: null };
    }

    return { kind: "single" as const, minutes: durations[0] };
  }

  if (!deliveryGroupId) {
    return { kind: "none" as const, minutes: null };
  }

  const duration = lessonDurationByGroupSubject[`${deliveryGroupId}:${subjectId}`] ?? null;
  if (duration === null) {
    return { kind: "none" as const, minutes: null };
  }

  return { kind: "single" as const, minutes: duration };
}

function formatDurationHint(durationHint: { kind: "none" | "single" | "mismatch"; minutes: number | null }) {
  if (durationHint.kind === "single" && durationHint.minutes !== null) {
    return `${durationHint.minutes} мин`;
  }

  if (durationHint.kind === "mismatch") {
    return "Требования классов отличаются";
  }

  return "Не задана";
}

function validateScheduleEditorValue(value: ScheduleEditorFormValue) {
  const detached = value.dayOfWeek === null || value.startMinutes === null || value.endMinutes === null;

  if (!detached && value.endMinutes !== null && value.startMinutes !== null && value.endMinutes <= value.startMinutes) {
    return "Время окончания должно быть позже времени начала";
  }

  if (value.deliveryMode === "DIRECT_GROUP" && !value.deliveryGroupId) {
    return "Выберите группу";
  }

  if (value.deliveryMode === "ELECTIVE_GROUP") {
    if (!value.deliveryGroupId) {
      return "Выберите группу по выбору";
    }

    if (value.openClassIds.length === 0) {
      return "Укажите хотя бы один открытый класс";
    }
  }

  if (value.deliveryMode === "SHARED_CLASSES" && value.coveredClassIds.length < 2) {
    return "Укажите минимум два покрываемых класса";
  }

  if (!value.subjectId) {
    return "Выберите предмет";
  }

  return null;
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
