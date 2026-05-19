"use client";

import { useMemo, useState } from "react";
import {
  useForm,
  type FieldComponent,
  type FormAsyncValidateOrFn,
  type FormValidateOrFn,
} from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
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
  getStepError,
  SCHEDULE_EDITOR_STEPS,
  type ScheduleCardKind,
  type ScheduleEditorStepId,
  type ScheduleStepperFormValue,
} from "../_lib/schedule-editor-flow";
import { ScheduleEditorStepper } from "./schedule-editor-stepper";
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
      const error = await onSave({
        templateId: value.templateId,
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
    setSubmitError(null);
    setAttemptedStepIds((previous) => {
      const next = new Set(previous);
      next.delete(currentStepId);
      return next;
    });

    const nextValues = normalizeScheduleEditorValue(
      {
        ...values,
        ...patch,
      },
      formContext,
    );

    const changedKeys = new Set<keyof ScheduleStepperFormValue>([
      ...Object.keys(patch),
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
    <DialogContent className="sm:max-w-4xl">
      <form
        className="flex flex-col gap-6"
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
            const stepErrors = Object.fromEntries(
              SCHEDULE_EDITOR_STEPS.map((step) => [
                step.id,
                getStepError(
                  step.id,
                  values,
                  classRows,
                  directGroupOptions,
                  electiveGroupOptions,
                  lessonDurationByGroupSubject,
                ),
              ]),
            ) as Record<ScheduleEditorStepId, string | null>;
            const firstBlockedStepIndex = SCHEDULE_EDITOR_STEPS.findIndex((step) => stepErrors[step.id] !== null);
            const accessibleStepIds = SCHEDULE_EDITOR_STEPS
              .slice(0, firstBlockedStepIndex === -1 ? SCHEDULE_EDITOR_STEPS.length : firstBlockedStepIndex + 1)
              .map((step) => step.id);
            const completedStepIds = SCHEDULE_EDITOR_STEPS
              .filter((step, index) => {
                if (stepErrors[step.id] !== null) {
                  return false;
                }

                return SCHEDULE_EDITOR_STEPS
                  .slice(0, index)
                  .every((previousStep) => stepErrors[previousStep.id] === null);
              })
              .map((step) => step.id);
            const currentStepIndex = SCHEDULE_EDITOR_STEPS.findIndex((step) => step.id === currentStepId);
            const currentStepError = stepErrors[currentStepId];
            const visibleCurrentStepError = attemptedStepIds.has(currentStepId) ? currentStepError : null;
            const canGoPrev = currentStepIndex > 0;
            const nextStepId = SCHEDULE_EDITOR_STEPS[currentStepIndex + 1]?.id ?? null;

            return (
              <>
                <ScheduleEditorStepper
                  steps={SCHEDULE_EDITOR_STEPS}
                  currentStepId={currentStepId}
                  completedStepIds={completedStepIds}
                  accessibleStepIds={accessibleStepIds}
                  onStepSelect={setCurrentStepId}
                />

                <EditorSummaryStrip
                  values={values}
                  classRows={classRows}
                  directGroupOptions={directGroupOptions}
                  electiveGroupOptions={electiveGroupOptions}
                  availableRoomOptions={availableRoomOptions}
                  availableTeacherOptions={availableTeacherOptions}
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
                  availableSubjectOptions={availableSubjectOptions}
                  availableRoomOptions={availableRoomOptions}
                  availableTeacherOptions={availableTeacherOptions}
                  durationMinutes={durationMinutes}
                  stepError={visibleCurrentStepError}
                  onPatch={(patch) => applyPatch(values, patch)}
                />

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
                        canSubmit: state.canSubmit,
                        isSubmitting: state.isSubmitting,
                      })}
                    >
                      {({ canSubmit, isSubmitting }) => (
                        <Button type="submit" disabled={!canSubmit || isSubmitting || currentStepError !== null}>
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
  availableSubjectOptions: ScheduleEditorSubject[];
  availableRoomOptions: AdminScheduleRoomOption[];
  availableTeacherOptions: AdminScheduleTeacherOption[];
  durationMinutes: number | null;
  stepError: string | null;
  onPatch: (patch: Partial<ScheduleStepperFormValue>) => void;
}) {
  const currentStep = SCHEDULE_EDITOR_STEPS.find((step) => step.id === stepId) ?? SCHEDULE_EDITOR_STEPS[0];

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <CardHeader>
        <CardTitle className="text-base">{currentStep.title}</CardTitle>
        <CardDescription>{currentStep.description}</CardDescription>
      </CardHeader>
      <div>
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
              error={stepError}
            />
          ) : null}

          {stepId === "teacher" ? (
            <TeacherStep
              FormField={FormField}
              values={values}
              teacherOptions={availableTeacherOptions}
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
      </div>
    </div>
  );
}

function KindStep({
  value,
  onPatch,
  error,
}: {
  value: ScheduleCardKind;
  onPatch: (patch: Partial<ScheduleStepperFormValue>) => void;
  error: string | null;
}) {
  const selectKind = (nextValue: ScheduleCardKind) => {
    onPatch({
      cardKind: nextValue,
      deliveryGroupId: null,
      openClassIds: [],
      coveredClassIds: [],
      subjectId: "",
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
                  subjectId: "",
                });
              }}
            />
            <FieldDescription>Нужно выбрать минимум два класса.</FieldDescription>
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        )}
      </FormField>
    );
  }

  const groupOptions = getGroupOptionsByKind(values.cardKind, directGroupOptions, electiveGroupOptions);
  const selectedGroup = groupOptions.find((option) => option.id === values.deliveryGroupId) ?? null;

  return (
    <>
      <FormField name="deliveryGroupId">
        {(field) => (
          <Field data-invalid={Boolean(error)}>
            <FieldLabel>{values.cardKind === "ELECTIVE_GROUP" ? "Группа по выбору" : "Группа"}</FieldLabel>
            <Select
              value={field.state.value ?? NONE_VALUE}
              onValueChange={(nextValue) => {
                field.handleBlur();
                onPatch({
                  deliveryGroupId: nextValue === NONE_VALUE ? null : nextValue,
                  subjectId: "",
                });
              }}
            >
              <SelectTrigger className="w-full" aria-invalid={Boolean(error) || undefined}>
                <SelectValue>
                  {selectedGroup?.name
                    ?? (values.cardKind === "ELECTIVE_GROUP" ? "Выберите группу по выбору" : "Выберите группу")}
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
            <FieldDescription>
              {selectedGroup
                ? `${selectedGroup.studentCount} чел.`
                : values.cardKind === "SUBGROUP"
                  ? "Показываются только подгруппы."
                  : values.cardKind === "CLASS"
                    ? "Показываются только классы."
                    : "Показываются только группы по выбору."}
            </FieldDescription>
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
                  field.handleChange(next);
                  field.handleBlur();
                }}
              />
              <FieldDescription>
                Эти классы увидят карточку у себя в строках расписания.
              </FieldDescription>
            </Field>
          )}
        </FormField>
      ) : null}

      {selectedGroup ? (
        <Field>
          <FieldLabel>Параметры группы</FieldLabel>
          <Input
            value={
              values.cardKind === "ELECTIVE_GROUP"
                ? `${selectedGroup.studentCount} чел.`
                : `${getGroupTypeLabel((selectedGroup as AdminScheduleGroupOption).type)} • ${selectedGroup.studentCount} чел.`
            }
            disabled
          />
        </Field>
      ) : null}

      {values.cardKind === "ELECTIVE_GROUP" && values.openClassIds.length > 0 ? (
        <Field>
          <FieldLabel>Открытые классы</FieldLabel>
          <Input
            value={classRows.filter((row) => values.openClassIds.includes(row.id)).map((row) => row.name).join(", ")}
            disabled
          />
        </Field>
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

  if (subjectOptions.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Нет доступных предметов</EmptyTitle>
          <EmptyDescription>Выбранная сущность не имеет предметов с настроенной длительностью.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <FormField name="subjectId">
      {(field) => (
        <Field data-invalid={Boolean(error)}>
          <FieldLabel>Предмет</FieldLabel>
          <Select
            value={field.state.value || NONE_VALUE}
            onValueChange={(nextValue) => {
              field.handleBlur();
              onPatch({
                subjectId: nextValue && nextValue !== NONE_VALUE ? nextValue : "",
              });
            }}
            disabled={values.cardKind === "ELECTIVE_GROUP" && subjectOptions.length <= 1}
          >
            <SelectTrigger className="w-full" aria-invalid={Boolean(error) || undefined}>
              <SelectValue>{selectedSubject?.name ?? "Выберите предмет"}</SelectValue>
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
  error,
}: {
  FormField: ScheduleEditorFieldRenderer;
  values: ScheduleStepperFormValue;
  roomOptions: AdminScheduleRoomOption[];
  error: string | null;
}) {
  if (!values.subjectId) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Сначала выберите предмет</EmptyTitle>
          <EmptyDescription>После выбора предмета станут доступны подходящие кабинеты.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <FormField name="roomId">
      {(field) => (
        <Field data-invalid={Boolean(error)}>
          <FieldLabel>Кабинет</FieldLabel>
          <Select
            value={field.state.value ?? NONE_VALUE}
            onValueChange={(nextValue) => {
              field.handleChange(nextValue === NONE_VALUE ? null : nextValue);
              field.handleBlur();
            }}
          >
            <SelectTrigger className="w-full" aria-invalid={Boolean(error) || undefined}>
              <SelectValue>
                {field.state.value
                  ? roomOptions.find((option) => option.id === field.state.value)?.name ?? "Кабинет"
                  : "Не указывать кабинет"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                <SelectItem value={NONE_VALUE}>Не указывать кабинет</SelectItem>
                {roomOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name} • {option.seatsCount} мест
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            Показываются только кабинеты, где можно вести предмет и хватает мест.
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
  teacherOptions,
  error,
}: {
  FormField: ScheduleEditorFieldRenderer;
  values: ScheduleStepperFormValue;
  teacherOptions: AdminScheduleTeacherOption[];
  error: string | null;
}) {
  if (!values.subjectId) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Сначала выберите предмет</EmptyTitle>
          <EmptyDescription>После выбора предмета станут доступны подходящие учителя.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <FormField name="teacherId">
      {(field) => (
        <Field data-invalid={Boolean(error)}>
          <FieldLabel>Учитель</FieldLabel>
          <Select
            value={field.state.value ?? NONE_VALUE}
            onValueChange={(nextValue) => {
              field.handleChange(nextValue === NONE_VALUE ? null : nextValue);
              field.handleBlur();
            }}
          >
            <SelectTrigger className="w-full" aria-invalid={Boolean(error) || undefined}>
              <SelectValue>
                {field.state.value
                  ? teacherOptions.find((option) => option.id === field.state.value)?.name ?? "Учитель"
                  : "Не указывать учителя"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                <SelectItem value={NONE_VALUE}>Не указывать учителя</SelectItem>
                {teacherOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>Показываются только учителя, которым назначен выбранный предмет.</FieldDescription>
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
  availableRoomOptions,
  availableTeacherOptions,
  subjectOptions,
  durationMinutes,
}: {
  values: ScheduleStepperFormValue;
  classRows: AdminScheduleClassRow[];
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  availableRoomOptions: AdminScheduleRoomOption[];
  availableTeacherOptions: AdminScheduleTeacherOption[];
  subjectOptions: ScheduleEditorSubject[];
  durationMinutes: number | null;
}) {
  const audienceLabel = getAudienceSummaryLabel(values, classRows, directGroupOptions, electiveGroupOptions);
  const subjectName = subjectOptions.find((option) => option.id === values.subjectId)?.name ?? "Не выбран";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2">
      <span className="px-1 text-xs font-medium text-muted-foreground">Конфигурация</span>
      <div className="flex flex-wrap gap-2">
        <SummaryItem label="Тип" value={getCardKindLabel(values.cardKind)} />
        <SummaryItem label="Состав" value={audienceLabel ?? "Не выбран"} />
        <SummaryItem label="Предмет" value={subjectName} />
        <SummaryItem label="Длительность" value={durationMinutes === null ? "Не задана" : `${durationMinutes} мин`} />
        <SummaryItem label="Кабинет" value={values.roomId ? "Выбран" : "Не указан"} />
        <SummaryItem label="Учитель" value={values.teacherId ? "Выбран" : "Не указан"} />
        <SummaryItem label="Каб." value={String(availableRoomOptions.length)} />
        <SummaryItem label="Уч." value={String(availableTeacherOptions.length)} />
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex max-w-64 items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
