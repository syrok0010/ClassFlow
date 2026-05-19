"use client";

import { useMemo, useState } from "react";
import {
  useForm,
  type FieldComponent,
  type FormAsyncValidateOrFn,
  type FormValidateOrFn,
} from "@tanstack/react-form";
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
import { cn } from "@/lib/utils";

import type {
  AdminScheduleClassRow,
  AdminScheduleElectiveGroupOption,
  AdminScheduleGroupOption,
  AdminScheduleRoomOption,
  AdminScheduleTeacherOption,
} from "../_lib/admin-schedule-types";
import {
  buildDefaultScheduleEditorValues,
  createScheduleEditorFormSchema,
  getInitialScheduleEditorStepId,
  getScheduleEditorStepErrors,
  minutesToTime,
  normalizeScheduleEditorValue,
  type ScheduleEditorDraft,
  type ScheduleEditorSubject,
} from "../_lib/schedule-editor-form";
import {
  getAudienceSelection,
  getAudienceSummaryLabel,
  getAvailableRoomOptions,
  getAvailableSubjectIds,
  getAvailableTeacherOptions,
  getCardKindLabel,
  getDurationMinutes,
  getGroupOptionsByKind,
  getGroupTypeLabel,
  type ScheduleCardKind,
  type ScheduleEditorStepId,
  type ScheduleStepperFormValue,
  SCHEDULE_EDITOR_STEPS,
} from "../_lib/schedule-editor-flow";
import { ScheduleMultiSelect, type FilterOption } from "./schedule-multi-select";

export type { ScheduleEditorDraft } from "../_lib/schedule-editor-form";

interface ScheduleEventEditorDialogProps {
  open: boolean;
  title: string;
  description: string;
  draft: ScheduleEditorDraft | null;
  subjectOptions: ScheduleEditorSubject[];
  classOptions: FilterOption[];
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  roomOptions: AdminScheduleRoomOption[];
  teacherOptions: AdminScheduleTeacherOption[];
  classRows: AdminScheduleClassRow[];
  lessonDurationByGroupSubject: Record<string, number>;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: ScheduleEditorDraft) => Promise<string | null>;
}

const DAY_OPTIONS = [
  { value: "1", label: "Понедельник" },
  { value: "2", label: "Вторник" },
  { value: "3", label: "Среда" },
  { value: "4", label: "Четверг" },
  { value: "5", label: "Пятница" },
];

const NONE_VALUE = "none";

const CARD_KIND_OPTIONS: Array<{ value: ScheduleCardKind; label: string; description: string }> = [
  { value: "CLASS", label: "Класс", description: "Обычное занятие целого класса." },
  { value: "SUBGROUP", label: "Подгруппа", description: "Занятие части класса по предмету." },
  { value: "ELECTIVE_GROUP", label: "Группа по выбору", description: "Optional-доп с открытостью для классов." },
  { value: "SHARED_CLASSES", label: "Общее занятие", description: "Совместный required/regime-слот для классов." },
];

const STEP_FIELDS: Record<ScheduleEditorStepId, Array<keyof ScheduleStepperFormValue>> = {
  kind: ["cardKind"],
  audience: ["deliveryGroupId", "openClassIds", "coveredClassIds"],
  subject: ["subjectId"],
  room: ["roomId"],
  teacher: ["teacherId"],
  time: ["dayOfWeek", "startMinutes", "endMinutes"],
};

const STEP_RESET_VALUES: Record<ScheduleEditorStepId, Partial<ScheduleStepperFormValue>> = {
  kind: {},
  audience: {
    deliveryGroupId: null,
    openClassIds: [],
    coveredClassIds: [],
  },
  subject: {
    subjectId: "",
  },
  room: {
    roomId: null,
  },
  teacher: {
    teacherId: null,
  },
  time: {
    dayOfWeek: null,
    startMinutes: null,
    endMinutes: null,
  },
};

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
  classRows,
  lessonDurationByGroupSubject,
  onOpenChange,
  onSave,
}: ScheduleEventEditorDialogProps) {
  const formContext = useMemo(
    () => ({
        subjectOptions,
        classRows,
        directGroupOptions,
        electiveGroupOptions,
        roomOptions,
        teacherOptions,
        lessonDurationByGroupSubject,
      }),
    [
      classRows,
      directGroupOptions,
      electiveGroupOptions,
      lessonDurationByGroupSubject,
      roomOptions,
      subjectOptions,
      teacherOptions,
    ],
  );
  const initialValues = useMemo(
    () => buildDefaultScheduleEditorValues({ draft, context: formContext }),
    [draft, formContext],
  );

  if (!draft) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <ScheduleEventEditorDialogContent
          key={JSON.stringify(initialValues)}
          title={title}
          description={description}
          initialValues={initialValues}
          subjectOptions={subjectOptions}
          classOptions={classOptions}
          directGroupOptions={directGroupOptions}
          electiveGroupOptions={electiveGroupOptions}
          roomOptions={roomOptions}
          teacherOptions={teacherOptions}
          classRows={classRows}
          lessonDurationByGroupSubject={lessonDurationByGroupSubject}
          onOpenChange={onOpenChange}
          onSave={onSave}
        />
      ) : null}
    </Dialog>
  );
}

type ScheduleEventEditorDialogContentProps = Omit<ScheduleEventEditorDialogProps, "open" | "draft"> & {
  initialValues: ScheduleStepperFormValue;
};

type ScheduleEditorFieldRenderer = FieldComponent<
  ScheduleStepperFormValue,
  FormValidateOrFn<ScheduleStepperFormValue> | undefined,
  FormValidateOrFn<ScheduleStepperFormValue> | undefined,
  FormAsyncValidateOrFn<ScheduleStepperFormValue> | undefined,
  FormValidateOrFn<ScheduleStepperFormValue> | undefined,
  FormAsyncValidateOrFn<ScheduleStepperFormValue> | undefined,
  FormValidateOrFn<ScheduleStepperFormValue> | undefined,
  FormAsyncValidateOrFn<ScheduleStepperFormValue> | undefined,
  FormValidateOrFn<ScheduleStepperFormValue> | undefined,
  FormAsyncValidateOrFn<ScheduleStepperFormValue> | undefined,
  FormAsyncValidateOrFn<ScheduleStepperFormValue> | undefined,
  unknown
>;

function ScheduleEventEditorDialogContent({
  title,
  description,
  initialValues,
  subjectOptions,
  classOptions,
  directGroupOptions,
  electiveGroupOptions,
  roomOptions,
  teacherOptions,
  classRows,
  lessonDurationByGroupSubject,
  onOpenChange,
  onSave,
}: ScheduleEventEditorDialogContentProps) {
  const formContext = useMemo(
    () => ({
      subjectOptions,
      classRows,
      directGroupOptions,
      electiveGroupOptions,
      roomOptions,
      teacherOptions,
      lessonDurationByGroupSubject,
    }),
    [
      classRows,
      directGroupOptions,
      electiveGroupOptions,
      lessonDurationByGroupSubject,
      roomOptions,
      subjectOptions,
      teacherOptions,
    ],
  );
  const validationSchema = useMemo(
    () => createScheduleEditorFormSchema(formContext),
    [formContext],
  );
  const [currentStepId, setCurrentStepId] = useState<ScheduleEditorStepId>(
    initialValues.templateId
      ? getInitialScheduleEditorStepId(
          initialValues,
          formContext,
        )
      : "kind",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attemptedStepIds, setAttemptedStepIds] = useState<Set<ScheduleEditorStepId>>(() => new Set());

  const form = useForm({
    defaultValues: initialValues satisfies ScheduleStepperFormValue,
    validators: {
      onChange: validationSchema,
      onBlur: validationSchema,
      onSubmit: validationSchema,
    },
    onSubmit: async ({ value }) => {
      const isScheduled = value.startMinutes !== null && value.dayOfWeek !== null;
      const error = await onSave({
        templateId: value.templateId,
        dayOfWeek: isScheduled ? value.dayOfWeek : null,
        startMinutes: isScheduled ? value.startMinutes : null,
        endMinutes: isScheduled ? value.endMinutes : null,
        subjectId: value.subjectId,
        deliveryMode: value.deliveryMode,
        deliveryGroupId: value.deliveryGroupId,
        roomId: value.roomId,
        teacherId: value.teacherId,
        openClassIds: value.openClassIds,
        coveredClassIds: value.coveredClassIds,
      });

      if (error) {
        setSubmitError(error);
        return;
      }

      onOpenChange(false);
    },
  });

  const setScheduleFieldValue = <K extends keyof ScheduleStepperFormValue>(
    field: K,
    value: ScheduleStepperFormValue[K],
  ) => {
    form.setFieldValue(field as never, value as never);
  };

  const applyPatch = (
    values: ScheduleStepperFormValue,
    patch: Partial<ScheduleStepperFormValue>,
  ) => {
    const changedStepId = getChangedStepId(patch);
    const resetPatch = changedStepId ? getResetPatchAfterStep(changedStepId) : {};

    setSubmitError(null);
    setAttemptedStepIds((previous) => {
      const next = new Set(previous);

      if (!changedStepId) {
        next.delete(currentStepId);
        return next;
      }

      const changedStepIndex = SCHEDULE_EDITOR_STEPS.findIndex((step) => step.id === changedStepId);
      for (const step of SCHEDULE_EDITOR_STEPS.slice(changedStepIndex)) {
        next.delete(step.id);
      }

      return next;
    });

    const nextValues = normalizeScheduleEditorValue(
      {
        ...values,
        ...patch,
        ...resetPatch,
      },
      formContext,
    );

    const changedKeys = new Set<keyof ScheduleStepperFormValue>([
      ...Object.keys(patch),
      ...Object.keys(resetPatch),
      "deliveryMode",
      "endMinutes",
      "roomId",
      "teacherId",
    ] as Array<keyof ScheduleStepperFormValue>);

    for (const key of changedKeys) {
      setScheduleFieldValue(key, nextValues[key]);
    }
  };

  return (
    <DialogContent className="sm:max-w-3xl">
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form.Subscribe selector={(state) => ({ values: state.values })}>
          {({ values }) => {
            const audienceSelection = getAudienceSelection(values, classRows, directGroupOptions, electiveGroupOptions);
            const availableSubjectIds = getAvailableSubjectIds(
              values,
              classRows,
              directGroupOptions,
              electiveGroupOptions,
            );
            const availableSubjectOptions = subjectOptions.filter((option) => availableSubjectIds.includes(option.id));
            const availableRoomOptions = getAvailableRoomOptions(
              roomOptions,
              audienceSelection,
              subjectOptions.find((subject) => subject.id === values.subjectId) ?? null,
            );
            const availableTeacherOptions = getAvailableTeacherOptions(
              teacherOptions,
              audienceSelection,
              values.subjectId,
            );
            const durationMinutes = getDurationMinutes(values, lessonDurationByGroupSubject);
            const stepErrors = getScheduleEditorStepErrors(values, formContext);
            const currentStepIndex = SCHEDULE_EDITOR_STEPS.findIndex((step) => step.id === currentStepId);
            const currentStepError = stepErrors[currentStepId];
            const visibleCurrentStepError =
              attemptedStepIds.has(currentStepId) || currentStepId === "time"
                ? currentStepError
                : null;
            const canGoPrev = currentStepIndex > 0;
            const nextStepId = SCHEDULE_EDITOR_STEPS[currentStepIndex + 1]?.id ?? null;
            const hasBlockingErrors = Object.values(stepErrors).some((error) => error !== null);

            return (
              <>
                <EditorProgress
                  currentStepIndex={currentStepIndex}
                  totalSteps={SCHEDULE_EDITOR_STEPS.length}
                />

                <EditorSummaryStrip
                  values={values}
                  classRows={classRows}
                  directGroupOptions={directGroupOptions}
                  electiveGroupOptions={electiveGroupOptions}
                  roomOptions={roomOptions}
                  teacherOptions={teacherOptions}
                  subjectOptions={subjectOptions}
                  durationMinutes={durationMinutes}
                />

                <CurrentStepContent
                  stepId={currentStepId}
                  FormField={form.Field as unknown as ScheduleEditorFieldRenderer}
                  values={values}
                  classRows={classRows}
                  classOptions={classOptions}
                  directGroupOptions={directGroupOptions}
                  electiveGroupOptions={electiveGroupOptions}
                  subjectOptions={subjectOptions}
                  availableSubjectOptions={availableSubjectOptions}
                  availableRoomOptions={availableRoomOptions}
                  availableTeacherOptions={availableTeacherOptions}
                  durationMinutes={durationMinutes}
                  stepError={visibleCurrentStepError}
                  onPatch={(patch) => applyPatch(values, patch)}
                />

                {currentStepId === "time" ? (
                  <FinalStepErrors
                    stepErrors={stepErrors}
                  />
                ) : null}

                <DialogFooter className="justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
                      Отмена
                    </Button>
                    {canGoPrev ? (
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setCurrentStepId(SCHEDULE_EDITOR_STEPS[currentStepIndex - 1].id)}
                      >
                        Назад
                      </Button>
                    ) : null}
                  </div>

                  {currentStepIndex < SCHEDULE_EDITOR_STEPS.length - 1 ? (
                    <Button
                      type="button"
                      onClick={() => {
                        if (currentStepError !== null) {
                          setAttemptedStepIds((previous) => new Set(previous).add(currentStepId));
                          return;
                        }

                        if (nextStepId) {
                          setCurrentStepId(nextStepId);
                        }
                      }}
                    >
                      Далее
                    </Button>
                  ) : (
                    <form.Subscribe
                      selector={(state) => ({
                        isSubmitting: state.isSubmitting,
                      })}
                    >
                      {({ isSubmitting }) => (
                        <Button type="submit" disabled={isSubmitting || hasBlockingErrors}>
                          Сохранить
                        </Button>
                      )}
                    </form.Subscribe>
                  )}
                </DialogFooter>
              </>
            );
          }}
        </form.Subscribe>
        {submitError ? <FieldError>{submitError}</FieldError> : null}
      </form>
    </DialogContent>
  );
}

function CurrentStepContent({
  stepId,
  FormField,
  values,
  classRows,
  classOptions,
  directGroupOptions,
  electiveGroupOptions,
  subjectOptions,
  availableSubjectOptions,
  availableRoomOptions,
  availableTeacherOptions,
  durationMinutes,
  stepError,
  onPatch,
}: {
  stepId: ScheduleEditorStepId;
  FormField: ScheduleEditorFieldRenderer;
  values: ScheduleStepperFormValue;
  classRows: AdminScheduleClassRow[];
  classOptions: FilterOption[];
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  subjectOptions: ScheduleEditorSubject[];
  availableSubjectOptions: ScheduleEditorSubject[];
  availableRoomOptions: AdminScheduleRoomOption[];
  availableTeacherOptions: AdminScheduleTeacherOption[];
  durationMinutes: number | null;
  stepError: string | null;
  onPatch: (patch: Partial<ScheduleStepperFormValue>) => void;
}) {
  return (
    <FieldGroup>
      {stepId === "kind" ? (
        <KindStep value={values.cardKind} onPatch={onPatch} error={stepError} />
      ) : null}

      {stepId === "audience" ? (
        <AudienceStep
          FormField={FormField}
          values={values}
          classOptions={classOptions}
          classRows={classRows}
          directGroupOptions={directGroupOptions}
          electiveGroupOptions={electiveGroupOptions}
          onPatch={onPatch}
          error={stepError}
        />
      ) : null}

      {stepId === "subject" ? (
        <SubjectStep
          FormField={FormField}
          values={values}
          subjectOptions={availableSubjectOptions}
          electiveGroupOptions={electiveGroupOptions}
          onPatch={onPatch}
          error={stepError}
        />
      ) : null}

      {stepId === "room" ? (
        <RoomStep
          FormField={FormField}
          values={values}
          roomOptions={availableRoomOptions}
          onPatch={onPatch}
          error={stepError}
        />
      ) : null}

      {stepId === "teacher" ? (
        <TeacherStep
          FormField={FormField}
          values={values}
          subjectOptions={subjectOptions}
          teacherOptions={availableTeacherOptions}
          onPatch={onPatch}
          error={stepError}
        />
      ) : null}

      {stepId === "time" ? (
        <TimeStep
          FormField={FormField}
          values={values}
          durationMinutes={durationMinutes}
          onPatch={onPatch}
          error={stepError}
        />
      ) : null}
    </FieldGroup>
  );
}

function getChangedStepId(patch: Partial<ScheduleStepperFormValue>) {
  return SCHEDULE_EDITOR_STEPS.find((step) =>
    STEP_FIELDS[step.id].some((field) => field in patch),
  )?.id ?? null;
}

function getResetPatchAfterStep(stepId: ScheduleEditorStepId) {
  const stepIndex = SCHEDULE_EDITOR_STEPS.findIndex((step) => step.id === stepId);

  return SCHEDULE_EDITOR_STEPS
    .slice(stepIndex + 1)
    .reduce<Partial<ScheduleStepperFormValue>>((result, step) => {
      return {
        ...result,
        ...STEP_RESET_VALUES[step.id],
      };
    }, {});
}

function SelectEmptyState({ message }: { message: string }) {
  return (
    <div className="px-2 py-1.5 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function FinalStepErrors({
  stepErrors,
}: {
  stepErrors: Record<ScheduleEditorStepId, string | null>;
}) {
  const messages = Array.from(
    new Set(
      Object.values(stepErrors).filter((message): message is string => Boolean(message)),
    ),
  );

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      {messages.map((message) => (
        <FieldError key={message}>{message}</FieldError>
      ))}
    </div>
  );
}

function EditorProgress({
  currentStepIndex,
  totalSteps,
}: {
  currentStepIndex: number;
  totalSteps: number;
}) {
  const safeStepIndex = currentStepIndex >= 0 ? currentStepIndex : 0;
  const progress = ((safeStepIndex + 1) / totalSteps) * 100;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Шаг {safeStepIndex + 1} из {totalSteps}
      </p>
      <div className="h-1 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground/80 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function getSelectedClassNames(classIds: string[], classRows: AdminScheduleClassRow[]) {
  return classRows
    .filter((row) => classIds.includes(row.id))
    .map((row) => row.name)
    .join(", ");
}

function getGroupSelectionDescription(
  cardKind: ScheduleCardKind | null,
  group: AdminScheduleGroupOption | AdminScheduleElectiveGroupOption | null,
) {
  if (!cardKind) {
    return "Сначала выберите тип карточки.";
  }

  if (!group) {
    if (cardKind === "SUBGROUP") {
      return "Показываются только подгруппы.";
    }

    if (cardKind === "CLASS") {
      return "Показываются только классы.";
    }

    if (cardKind === "ELECTIVE_GROUP") {
      return "Показываются только группы по выбору.";
    }

    return null;
  }

  if (cardKind === "ELECTIVE_GROUP") {
    return `${group.studentCount} чел.`;
  }

  return `${getGroupTypeLabel((group as AdminScheduleGroupOption).type)} • ${group.studentCount} чел.`;
}

function getTimeSummaryLabel(values: Pick<ScheduleStepperFormValue, "dayOfWeek" | "startMinutes" | "endMinutes">) {
  if (values.startMinutes === null) {
    return "Временная область";
  }

  if (values.dayOfWeek === null) {
    return null;
  }

  const dayLabel = DAY_OPTIONS.find((option) => Number(option.value) === values.dayOfWeek)?.label;
  if (!dayLabel) {
    return null;
  }

  if (values.startMinutes === null || values.endMinutes === null) {
    return dayLabel;
  }

  return `${dayLabel} • ${minutesToTime(values.startMinutes)}-${minutesToTime(values.endMinutes)}`;
}

function KindStep({
  value,
  onPatch,
  error,
}: {
  value: ScheduleCardKind | null;
  onPatch: (patch: Partial<ScheduleStepperFormValue>) => void;
  error: string | null;
}) {
  const selectKind = (nextValue: ScheduleCardKind) => {
    onPatch({
      cardKind: nextValue,
    });
  };

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel>Тип карточки</FieldLabel>
      <div className="grid gap-2 sm:grid-cols-2">
        {CARD_KIND_OPTIONS.map((option) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              className={cn(
                "flex min-h-24 flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                "hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                isSelected && "border-primary bg-primary/5 text-foreground ring-1 ring-primary",
              )}
              onClick={() => selectKind(option.value)}
            >
              <span className="text-sm font-semibold">{option.label}</span>
              <span className="text-xs leading-snug text-muted-foreground">{option.description}</span>
            </button>
          );
        })}
      </div>
      <FieldDescription>После выбора типа станет доступен подходящий состав.</FieldDescription>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

function AudienceStep({
  FormField,
  values,
  classOptions,
  classRows,
  directGroupOptions,
  electiveGroupOptions,
  onPatch,
  error,
}: {
  FormField: ScheduleEditorFieldRenderer;
  values: ScheduleStepperFormValue;
  classOptions: FilterOption[];
  classRows: AdminScheduleClassRow[];
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  onPatch: (patch: Partial<ScheduleStepperFormValue>) => void;
  error: string | null;
}) {
  if (values.cardKind === "SHARED_CLASSES") {
    return (
      <FormField name="coveredClassIds">
        {(field) => (
          <Field data-invalid={Boolean(error)}>
            <FieldLabel>Классы</FieldLabel>
            <ScheduleMultiSelect
              title="Классы"
              options={classOptions}
              selectedIds={field.state.value}
              onChange={(next) => {
                field.handleBlur();
                onPatch({
                  coveredClassIds: next,
                });
              }}
            />
            <FieldDescription>
              {field.state.value.length > 0
                ? getSelectedClassNames(field.state.value, classRows)
                : "Нужно выбрать минимум два класса."}
            </FieldDescription>
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        )}
      </FormField>
    );
  }

  const groupOptions = getGroupOptionsByKind(values.cardKind, directGroupOptions, electiveGroupOptions);
  const selectedGroup = groupOptions.find((option) => option.id === values.deliveryGroupId) ?? null;
  const openClassNames = getSelectedClassNames(values.openClassIds, classRows);
  const groupPlaceholder = values.cardKind === "ELECTIVE_GROUP"
    ? "Выберите группу по выбору"
    : "Выберите группу";

  return (
    <>
      <FormField name="deliveryGroupId">
        {(field) => (
          <Field data-invalid={Boolean(error)}>
            <FieldLabel>{values.cardKind === "ELECTIVE_GROUP" ? "Группа по выбору" : "Группа"}</FieldLabel>
            <Select
              value={field.state.value ?? NONE_VALUE}
              disabled={groupOptions.length === 0}
              onValueChange={(nextValue) => {
                field.handleBlur();
                onPatch({
                  deliveryGroupId: nextValue === NONE_VALUE ? null : nextValue,
                });
              }}
            >
              <SelectTrigger className="w-full" aria-invalid={Boolean(error) || undefined}>
                <SelectValue>
                  {selectedGroup?.name ?? (groupOptions.length === 0 ? "Ничего не найдено" : groupPlaceholder)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start">
                {groupOptions.length > 0 ? (
                  <SelectGroup>
                    {groupOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : (
                  <SelectEmptyState message="Ничего не найдено" />
                )}
              </SelectContent>
            </Select>
            <FieldDescription>{getGroupSelectionDescription(values.cardKind, selectedGroup)}</FieldDescription>
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        )}
      </FormField>

      {values.cardKind === "ELECTIVE_GROUP" ? (
        <FormField name="openClassIds">
          {(field) => (
            <Field>
              <FieldLabel>Открыт для классов</FieldLabel>
              <ScheduleMultiSelect
                title="Классы"
                options={classOptions}
                selectedIds={field.state.value}
                onChange={(next) => {
                  field.handleBlur();
                  onPatch({
                    openClassIds: next,
                  });
                }}
              />
              <FieldDescription>
                {openClassNames || "Эти классы увидят карточку у себя в строках расписания."}
              </FieldDescription>
            </Field>
          )}
        </FormField>
      ) : null}
    </>
  );
}

function SubjectStep({
  FormField,
  values,
  subjectOptions,
  electiveGroupOptions,
  onPatch,
  error,
}: {
  FormField: ScheduleEditorFieldRenderer;
  values: ScheduleStepperFormValue;
  subjectOptions: ScheduleEditorSubject[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  onPatch: (patch: Partial<ScheduleStepperFormValue>) => void;
  error: string | null;
}) {
  const selectedSubject = subjectOptions.find((option) => option.id === values.subjectId) ?? null;
  const electiveGroup = values.cardKind === "ELECTIVE_GROUP"
    ? electiveGroupOptions.find((option) => option.id === values.deliveryGroupId) ?? null
    : null;

  return (
    <FormField name="subjectId">
      {(field) => (
        <Field data-invalid={Boolean(error)}>
          <FieldLabel>Предмет</FieldLabel>
          <Select
            value={field.state.value || NONE_VALUE}
            disabled={subjectOptions.length === 0}
            onValueChange={(nextValue) => {
              field.handleBlur();
              onPatch({
                subjectId: nextValue && nextValue !== NONE_VALUE ? nextValue : "",
              });
            }}
          >
            <SelectTrigger className="w-full" aria-invalid={Boolean(error) || undefined}>
              <SelectValue>{selectedSubject?.name ?? (subjectOptions.length === 0 ? "Ничего не найдено" : "Выберите предмет")}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {subjectOptions.length > 0 ? (
                <SelectGroup>
                  {subjectOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ) : (
                <SelectEmptyState message="Ничего не найдено" />
              )}
            </SelectContent>
          </Select>
          {subjectOptions.length === 0 ? (
            <FieldDescription>Для выбранной сущности нет предметов с настроенной длительностью.</FieldDescription>
          ) : null}
          {values.cardKind === "ELECTIVE_GROUP" && electiveGroup ? (
            <FieldDescription>Предмет уже закреплен за группой «{electiveGroup.name}».</FieldDescription>
          ) : null}
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      )}
    </FormField>
  );
}

function RoomStep({
  FormField,
  values,
  roomOptions,
  onPatch,
  error,
}: {
  FormField: ScheduleEditorFieldRenderer;
  values: ScheduleStepperFormValue;
  roomOptions: AdminScheduleRoomOption[];
  onPatch: (patch: Partial<ScheduleStepperFormValue>) => void;
  error: string | null;
}) {
  if (!values.subjectId) {
    return (
      <p className="text-sm text-muted-foreground">
        Сначала выберите предмет.
      </p>
    );
  }

  return (
    <FormField name="roomId">
      {(field) => (
        <Field data-invalid={Boolean(error)}>
          <FieldLabel>Кабинет</FieldLabel>
          <Select
            value={field.state.value ?? NONE_VALUE}
            disabled={roomOptions.length === 0}
            onValueChange={(nextValue) => {
              field.handleBlur();
              onPatch({
                roomId: nextValue === NONE_VALUE ? null : nextValue,
              });
            }}
          >
            <SelectTrigger className="w-full" aria-invalid={Boolean(error) || undefined}>
              <SelectValue>
                {field.state.value
                  ? roomOptions.find((option) => option.id === field.state.value)?.name ?? "Кабинет"
                  : roomOptions.length === 0
                    ? "Ничего не найдено"
                    : "Выберите кабинет"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              {roomOptions.length > 0 ? (
                <SelectGroup>
                  {roomOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name} • {option.seatsCount} мест
                    </SelectItem>
                  ))}
                </SelectGroup>
              ) : (
                <SelectEmptyState message="Ничего не найдено" />
              )}
            </SelectContent>
          </Select>
          <FieldDescription>
            {roomOptions.length === 0
              ? "Для выбранной комбинации нет подходящих кабинетов."
              : "Показываются только кабинеты, где можно вести предмет и хватает мест."}
          </FieldDescription>
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      )}
    </FormField>
  );
}

function TeacherStep({
  FormField,
  values,
  subjectOptions,
  teacherOptions,
  onPatch,
  error,
}: {
  FormField: ScheduleEditorFieldRenderer;
  values: ScheduleStepperFormValue;
  subjectOptions: ScheduleEditorSubject[];
  teacherOptions: AdminScheduleTeacherOption[];
  onPatch: (patch: Partial<ScheduleStepperFormValue>) => void;
  error: string | null;
}) {
  if (!values.subjectId) {
    return (
      <p className="text-sm text-muted-foreground">
        Сначала выберите предмет.
      </p>
    );
  }

  const subject = subjectOptions.find((option) => option.id === values.subjectId) ?? null;
  const isTeacherOptional = subject?.type === "REGIME";

  return (
    <FormField name="teacherId">
      {(field) => (
        <Field data-invalid={Boolean(error)}>
          <FieldLabel>Учитель</FieldLabel>
          <Select
            value={field.state.value ?? NONE_VALUE}
            onValueChange={(nextValue) => {
              field.handleBlur();
              onPatch({
                teacherId: nextValue === NONE_VALUE ? null : nextValue,
              });
            }}
          >
            <SelectTrigger className="w-full" aria-invalid={Boolean(error) || undefined}>
              <SelectValue>
                {field.state.value
                  ? teacherOptions.find((option) => option.id === field.state.value)?.name ?? "Учитель"
                  : "Не выбран"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                <SelectItem value={NONE_VALUE}>Не выбран</SelectItem>
                {teacherOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectGroup>
              {teacherOptions.length === 0 && !isTeacherOptional ? <SelectEmptyState message="Ничего не найдено" /> : null}
            </SelectContent>
          </Select>
          <FieldDescription>
            {teacherOptions.length === 0 && isTeacherOptional
              ? "Для режимного предмета учителя можно не назначать."
              : teacherOptions.length === 0
              ? "Для выбранной комбинации нет подходящих учителей."
              : isTeacherOptional
                ? "Для режимного предмета учителя можно не назначать."
                : "Показываются только учителя, которым назначен выбранный предмет."}
          </FieldDescription>
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      )}
    </FormField>
  );
}

function TimeStep({
  FormField,
  values,
  durationMinutes,
  onPatch,
  error,
}: {
  FormField: ScheduleEditorFieldRenderer;
  values: ScheduleStepperFormValue;
  durationMinutes: number | null;
  onPatch: (patch: Partial<ScheduleStepperFormValue>) => void;
  error: string | null;
}) {
  return (
    <>
      <FormField name="dayOfWeek">
        {(field) => {
          const errors = getFieldErrorMessages(field as never);

          return (
            <Field data-invalid={errors.length > 0}>
              <FieldLabel>День</FieldLabel>
              <Select
                value={field.state.value === null ? NONE_VALUE : String(field.state.value)}
                onValueChange={(value) => {
                  field.handleBlur();
                  onPatch({
                    dayOfWeek: value === NONE_VALUE ? null : Number(value),
                    startMinutes: value === NONE_VALUE ? null : values.startMinutes,
                  });
                }}
              >
                <SelectTrigger className="w-full" aria-invalid={errors.length > 0 || undefined}>
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
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField name="startMinutes">
          {(field) => {
            const errors = getFieldErrorMessages(field as never);

            return (
              <Field data-invalid={errors.length > 0}>
                <FieldLabel htmlFor="schedule-editor-start-time">Время начала</FieldLabel>
                <Input
                  id="schedule-editor-start-time"
                  type="time"
                  value={minutesToTime(field.state.value)}
                  aria-invalid={errors.length > 0 || undefined}
                  disabled={values.dayOfWeek === null}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    onPatch({
                      startMinutes: Number.isNaN(event.target.valueAsNumber)
                        ? null
                        : event.target.valueAsNumber / 1000 / 60,
                    })}
                />
                {errors.length > 0 ? <FieldError>{errors[0]}</FieldError> : null}
              </Field>
            );
          }}
        </FormField>

        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="schedule-editor-duration">Длительность</FieldLabel>
          <Input
            id="schedule-editor-duration"
            value={durationMinutes === null ? "Не задана" : `${durationMinutes} мин`}
            disabled
            aria-invalid={Boolean(error) || undefined}
          />
        </Field>

        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="schedule-editor-end-time">Время окончания</FieldLabel>
          <Input
            id="schedule-editor-end-time"
            type="time"
            value={minutesToTime(values.endMinutes)}
            disabled
            aria-invalid={Boolean(error) || undefined}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      </div>
    </>
  );
}

function EditorSummaryStrip({
  values,
  classRows,
  directGroupOptions,
  electiveGroupOptions,
  roomOptions,
  teacherOptions,
  subjectOptions,
  durationMinutes,
}: {
  values: ScheduleStepperFormValue;
  classRows: AdminScheduleClassRow[];
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  roomOptions: AdminScheduleRoomOption[];
  teacherOptions: AdminScheduleTeacherOption[];
  subjectOptions: ScheduleEditorSubject[];
  durationMinutes: number | null;
}) {
  const audienceLabel = getAudienceSummaryLabel(values, classRows, directGroupOptions, electiveGroupOptions);
  const subjectName = subjectOptions.find((option) => option.id === values.subjectId)?.name ?? null;
  const roomName = roomOptions.find((option) => option.id === values.roomId)?.name ?? null;
  const teacherName = teacherOptions.find((option) => option.id === values.teacherId)?.name ?? null;
  const timeLabel = getTimeSummaryLabel(values);
  const summaryItems = [
    getCardKindLabel(values.cardKind),
    audienceLabel,
    subjectName,
    durationMinutes === null ? null : `${durationMinutes} мин`,
    roomName,
    teacherName,
    timeLabel,
  ].filter((value): value is string => Boolean(value));

  if (summaryItems.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {summaryItems.map((item, index) => (
        <SummaryItem key={`${item}-${index}`} value={item} />
      ))}
    </div>
  );
}

function SummaryItem({ value }: { value: string }) {
  return (
    <div className="inline-flex max-w-full items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
      <span className="truncate">{value}</span>
    </div>
  );
}
