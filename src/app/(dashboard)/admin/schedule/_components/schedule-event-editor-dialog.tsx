"use client";

import { useMemo, useState } from "react";
import {
  useForm,
  type FieldComponent,
  type FormAsyncValidateOrFn,
  type FormValidateOrFn,
} from "@tanstack/react-form";
import { z } from "zod";

import type { SubjectType } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SegmentedControl } from "@/components/ui/segmented-control";
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
  AdminScheduleClassRow,
  AdminScheduleElectiveGroupOption,
  AdminScheduleGroupOption,
  AdminScheduleRoomOption,
  AdminScheduleTeacherOption,
} from "../_lib/admin-schedule-types";
import {
  getAudienceSelection,
  getAudienceSummaryLabel,
  getAvailableRoomOptions,
  getAvailableSubjectIds,
  getAvailableTeacherOptions,
  getCardKindLabel,
  getDeliveryModeForCardKind,
  getDerivedEndMinutes,
  getDurationMinutes,
  getGroupOptionsByKind,
  getGroupTypeLabel,
  getInitialCardKind,
  getStepError,
  SCHEDULE_EDITOR_STEPS,
  type ScheduleCardKind,
  type ScheduleEditorStepId,
  type ScheduleStepperFormValue,
} from "../_lib/schedule-editor-flow";
import { ScheduleEditorStepper } from "./schedule-editor-stepper";
import { ScheduleMultiSelect, type FilterOption } from "./schedule-multi-select";

type SubjectOption = { id: string; name: string; type: SubjectType };

export type ScheduleEditorDraft = {
  templateId?: string;
  dayOfWeek: number | null;
  startMinutes: number | null;
  endMinutes: number | null;
  subjectId: string;
  deliveryMode: ScheduleStepperFormValue["deliveryMode"];
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
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  roomOptions: AdminScheduleRoomOption[];
  teacherOptions: AdminScheduleTeacherOption[];
  classRows: AdminScheduleClassRow[];
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

const CARD_KIND_OPTIONS: Array<{ value: ScheduleCardKind; label: string }> = [
  { value: "CLASS", label: "Класс" },
  { value: "SUBGROUP", label: "Подгруппа" },
  { value: "ELECTIVE_GROUP", label: "Группа по выбору" },
  { value: "SHARED_CLASSES", label: "Объединенная группа" },
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
  const initialValues = useMemo(
    () =>
      buildDefaultValues({
        draft,
        classRows,
        directGroupOptions,
        electiveGroupOptions,
        lessonDurationByGroupSubject,
      }),
    [
      classRows,
      directGroupOptions,
      draft,
      electiveGroupOptions,
      lessonDurationByGroupSubject,
    ],
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
  const validationSchema = useMemo(
    () =>
      createScheduleEditorFormSchema({
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
      teacherOptions,
    ],
  );
  const [currentStepId, setCurrentStepId] = useState<ScheduleEditorStepId>(
    getInitialStepId(
      initialValues,
      classRows,
      directGroupOptions,
      electiveGroupOptions,
      lessonDurationByGroupSubject,
    ),
  );

  const form = useForm({
    defaultValues: initialValues satisfies ScheduleStepperFormValue,
    validators: {
      onChange: validationSchema,
      onBlur: validationSchema,
      onSubmit: validationSchema,
    },
    onSubmit: async ({ value }) => {
      await onSave({
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

      onOpenChange(false);
    },
  });

  const values = form.state.values;
  const audienceSelection = useMemo(
    () => getAudienceSelection(values, classRows, directGroupOptions, electiveGroupOptions),
    [classRows, directGroupOptions, electiveGroupOptions, values],
  );
  const availableSubjectIds = useMemo(
    () => getAvailableSubjectIds(values, classRows, directGroupOptions, electiveGroupOptions),
    [classRows, directGroupOptions, electiveGroupOptions, values],
  );
  const availableSubjectOptions = useMemo(
    () => subjectOptions.filter((option) => availableSubjectIds.includes(option.id)),
    [availableSubjectIds, subjectOptions],
  );
  const availableRoomOptions = useMemo(
    () => getAvailableRoomOptions(roomOptions, audienceSelection, values.subjectId),
    [audienceSelection, roomOptions, values.subjectId],
  );
  const availableTeacherOptions = useMemo(
    () => getAvailableTeacherOptions(teacherOptions, audienceSelection, values.subjectId),
    [audienceSelection, teacherOptions, values.subjectId],
  );
  const durationMinutes = useMemo(
    () => getDurationMinutes(values, lessonDurationByGroupSubject),
    [lessonDurationByGroupSubject, values],
  );
  const stepErrors = useMemo(
    () =>
      Object.fromEntries(
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
      ) as Record<ScheduleEditorStepId, string | null>,
    [classRows, directGroupOptions, electiveGroupOptions, lessonDurationByGroupSubject, values],
  );
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
  const canGoPrev = currentStepIndex > 0;
  const canGoNext =
    currentStepError === null
    && currentStepIndex < SCHEDULE_EDITOR_STEPS.length - 1
    && accessibleStepIds.includes(SCHEDULE_EDITOR_STEPS[currentStepIndex + 1]?.id ?? "kind");

  const setScheduleFieldValue = <K extends keyof ScheduleStepperFormValue>(
    field: K,
    value: ScheduleStepperFormValue[K],
  ) => {
    form.setFieldValue(field as never, value as never);
  };

  const applyPatch = (patch: Partial<ScheduleStepperFormValue>) => {
    const nextValues = normalizeScheduleEditorValue(
      {
        ...form.state.values,
        ...patch,
      },
      {
        classRows,
        directGroupOptions,
        electiveGroupOptions,
        roomOptions,
        teacherOptions,
        lessonDurationByGroupSubject,
      },
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

        <ScheduleEditorStepper
          steps={SCHEDULE_EDITOR_STEPS}
          currentStepId={currentStepId}
          completedStepIds={completedStepIds}
          accessibleStepIds={accessibleStepIds}
          onStepSelect={setCurrentStepId}
        />

        <EditorSummaryCard
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
          stepError={currentStepError}
          onPatch={applyPatch}
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
              disabled={!canGoNext}
              onClick={() => setCurrentStepId(SCHEDULE_EDITOR_STEPS[currentStepIndex + 1].id)}
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
  availableSubjectOptions: SubjectOption[];
  availableRoomOptions: AdminScheduleRoomOption[];
  availableTeacherOptions: AdminScheduleTeacherOption[];
  durationMinutes: number | null;
  stepError: string | null;
  onPatch: (patch: Partial<ScheduleStepperFormValue>) => void;
}) {
  const currentStep = SCHEDULE_EDITOR_STEPS.find((step) => step.id === stepId) ?? SCHEDULE_EDITOR_STEPS[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{currentStep.title}</Badge>
        </div>
        <CardTitle>{currentStep.title}</CardTitle>
        <CardDescription>{currentStep.description}</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
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
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel>Тип карточки</FieldLabel>
      <SegmentedControl
        value={value}
        onChange={(nextValue) => {
          if (nextValue === "CLASS") {
            onPatch({
              cardKind: nextValue,
              deliveryGroupId: null,
              openClassIds: [],
              coveredClassIds: [],
              subjectId: "",
            });
          } else if (nextValue === "SUBGROUP") {
            onPatch({
              cardKind: nextValue,
              deliveryGroupId: null,
              openClassIds: [],
              coveredClassIds: [],
              subjectId: "",
            });
          } else if (nextValue === "ELECTIVE_GROUP") {
            onPatch({
              cardKind: nextValue,
              deliveryGroupId: null,
              openClassIds: [],
              coveredClassIds: [],
              subjectId: "",
            });
          } else {
            onPatch({
              cardKind: nextValue,
              deliveryGroupId: null,
              openClassIds: [],
              coveredClassIds: [],
              subjectId: "",
            });
          }
        }}
        options={CARD_KIND_OPTIONS}
        className="w-full"
      />
      <FieldDescription>Тип определяет, какие группы можно будет выбрать на следующем шаге.</FieldDescription>
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
  subjectOptions: SubjectOption[];
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

function EditorSummaryCard({
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
  subjectOptions: SubjectOption[];
  durationMinutes: number | null;
}) {
  const audienceLabel = getAudienceSummaryLabel(values, classRows, directGroupOptions, electiveGroupOptions);
  const subjectName = subjectOptions.find((option) => option.id === values.subjectId)?.name ?? "Не выбран";

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Текущая конфигурация</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Тип" value={getCardKindLabel(values.cardKind)} />
        <SummaryItem label="Состав" value={audienceLabel ?? "Не выбран"} />
        <SummaryItem label="Предмет" value={subjectName} />
        <SummaryItem label="Длительность" value={durationMinutes === null ? "Не задана" : `${durationMinutes} мин`} />
        <SummaryItem label="Кабинет" value={values.roomId ? "Выбран" : "Не указан"} />
        <SummaryItem label="Учитель" value={values.teacherId ? "Выбран" : "Не указан"} />
        <SummaryItem label="Подходящих кабинетов" value={String(availableRoomOptions.length)} />
        <SummaryItem label="Подходящих учителей" value={String(availableTeacherOptions.length)} />
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function buildDefaultValues({
  draft,
  classRows,
  directGroupOptions,
  electiveGroupOptions,
  lessonDurationByGroupSubject,
}: {
  draft: ScheduleEditorDraft | null;
  classRows: AdminScheduleClassRow[];
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  lessonDurationByGroupSubject: Record<string, number>;
}) {
  const cardKind = getInitialCardKind(draft, directGroupOptions);
  const availableGroups = getGroupOptionsByKind(cardKind, directGroupOptions, electiveGroupOptions);
  const fallbackGroupId = availableGroups[0]?.id ?? null;
  const initialValue = normalizeScheduleEditorValue(
    {
      templateId: draft?.templateId,
      cardKind,
      deliveryMode: getDeliveryModeForCardKind(cardKind),
      deliveryGroupId: draft?.deliveryGroupId ?? fallbackGroupId,
      openClassIds: draft?.openClassIds ?? [],
      coveredClassIds: draft?.coveredClassIds ?? [],
      subjectId: draft?.subjectId ?? "",
      roomId: draft?.roomId ?? null,
      teacherId: draft?.teacherId ?? null,
      dayOfWeek: draft?.dayOfWeek ?? null,
      startMinutes: draft?.startMinutes ?? null,
      endMinutes: draft?.endMinutes ?? null,
    },
    {
      classRows,
      directGroupOptions,
      electiveGroupOptions,
      roomOptions: [],
      teacherOptions: [],
      lessonDurationByGroupSubject,
    },
  );

  const availableSubjectIds = getAvailableSubjectIds(
    initialValue,
    classRows,
    directGroupOptions,
    electiveGroupOptions,
  );

  if (!initialValue.subjectId && availableSubjectIds.length === 1) {
    return normalizeScheduleEditorValue(
      {
        ...initialValue,
        subjectId: availableSubjectIds[0],
      },
      {
        classRows,
        directGroupOptions,
        electiveGroupOptions,
        roomOptions: [],
        teacherOptions: [],
        lessonDurationByGroupSubject,
      },
    );
  }

  return initialValue;
}

function createScheduleEditorFormSchema(context: {
  classRows: AdminScheduleClassRow[];
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  roomOptions: AdminScheduleRoomOption[];
  teacherOptions: AdminScheduleTeacherOption[];
  lessonDurationByGroupSubject: Record<string, number>;
}) {
  return z.object({
    templateId: z.string().optional(),
    cardKind: z.enum(["CLASS", "SUBGROUP", "ELECTIVE_GROUP", "SHARED_CLASSES"]),
    deliveryMode: z.enum(["DIRECT_GROUP", "ELECTIVE_GROUP", "SHARED_CLASSES"]),
    deliveryGroupId: z.string().nullable(),
    openClassIds: z.array(z.string().min(1)),
    coveredClassIds: z.array(z.string().min(1)),
    subjectId: z.string(),
    roomId: z.string().nullable(),
    teacherId: z.string().nullable(),
    dayOfWeek: z.number().int().min(1).max(5).nullable(),
    startMinutes: z.number().int().min(0).max(24 * 60 - 1).nullable(),
    endMinutes: z.number().int().min(1).max(24 * 60).nullable(),
  }).superRefine((value, ctx) => {
    if (value.deliveryMode !== getDeliveryModeForCardKind(value.cardKind)) {
      ctx.addIssue({
        code: "custom",
        path: ["cardKind"],
        message: "Тип карточки и режим доставки рассинхронизированы",
      });
    }

    if (value.cardKind === "SHARED_CLASSES") {
      if (value.coveredClassIds.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["coveredClassIds"],
          message: "Нужно выбрать минимум два класса",
        });
      }
    } else if (!value.deliveryGroupId) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryGroupId"],
        message: "Выберите группу",
      });
    }

    const subjectIds = getAvailableSubjectIds(
      value,
      context.classRows,
      context.directGroupOptions,
      context.electiveGroupOptions,
    );

    if (subjectIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["subjectId"],
        message: "Для выбранной сущности нет доступных предметов",
      });
    } else if (!value.subjectId || !subjectIds.includes(value.subjectId)) {
      ctx.addIssue({
        code: "custom",
        path: ["subjectId"],
        message: "Выберите подходящий предмет",
      });
    }

    if (value.roomId) {
      const audienceSelection = getAudienceSelection(
        value,
        context.classRows,
        context.directGroupOptions,
        context.electiveGroupOptions,
      );
      const rooms = getAvailableRoomOptions(context.roomOptions, audienceSelection, value.subjectId);
      if (!rooms.some((room) => room.id === value.roomId)) {
        ctx.addIssue({
          code: "custom",
          path: ["roomId"],
          message: "Выбранный кабинет не подходит",
        });
      }
    }

    if (value.teacherId) {
      const audienceSelection = getAudienceSelection(
        value,
        context.classRows,
        context.directGroupOptions,
        context.electiveGroupOptions,
      );
      const teachers = getAvailableTeacherOptions(context.teacherOptions, audienceSelection, value.subjectId);
      if (!teachers.some((teacher) => teacher.id === value.teacherId)) {
        ctx.addIssue({
          code: "custom",
          path: ["teacherId"],
          message: "Выбранный учитель не подходит",
        });
      }
    }

    if (value.dayOfWeek === null) {
      if (value.startMinutes !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["startMinutes"],
          message: "Во временной области не нужно задавать время начала",
        });
      }
      return;
    }

    const durationMinutes = getDurationMinutes(value, context.lessonDurationByGroupSubject);
    if (durationMinutes === null) {
      ctx.addIssue({
        code: "custom",
        path: ["subjectId"],
        message: "Для выбранной комбинации не найдена длительность",
      });
      return;
    }

    if (value.startMinutes === null) {
      ctx.addIssue({
        code: "custom",
        path: ["startMinutes"],
        message: "Укажите время начала",
      });
      return;
    }

    const endMinutes = getDerivedEndMinutes(value.startMinutes, durationMinutes);
    if (endMinutes === null || value.endMinutes !== endMinutes) {
      ctx.addIssue({
        code: "custom",
        path: ["endMinutes"],
        message: "Время окончания рассчитано некорректно",
      });
      return;
    }

    if (endMinutes > 24 * 60) {
      ctx.addIssue({
        code: "custom",
        path: ["endMinutes"],
        message: "Время окончания выходит за пределы суток",
      });
    }
  });
}

function getInitialStepId(
  value: ScheduleStepperFormValue,
  classRows: AdminScheduleClassRow[],
  directGroupOptions: AdminScheduleGroupOption[],
  electiveGroupOptions: AdminScheduleElectiveGroupOption[],
  lessonDurationByGroupSubject: Record<string, number>,
) {
  const firstInvalid = SCHEDULE_EDITOR_STEPS.find(
    (step) => getStepError(step.id, value, classRows, directGroupOptions, electiveGroupOptions, lessonDurationByGroupSubject) !== null,
  );

  return firstInvalid?.id ?? "time";
}

function normalizeScheduleEditorValue(
  value: ScheduleStepperFormValue,
  context: {
    classRows: AdminScheduleClassRow[];
    directGroupOptions: AdminScheduleGroupOption[];
    electiveGroupOptions: AdminScheduleElectiveGroupOption[];
    roomOptions: AdminScheduleRoomOption[];
    teacherOptions: AdminScheduleTeacherOption[];
    lessonDurationByGroupSubject: Record<string, number>;
  },
) {
  const classIdSet = new Set(context.classRows.map((row) => row.id));
  const availableGroups = getGroupOptionsByKind(
    value.cardKind,
    context.directGroupOptions,
    context.electiveGroupOptions,
  );
  const availableGroupIdSet = new Set(availableGroups.map((group) => group.id));
  const baseValue: ScheduleStepperFormValue = {
    ...value,
    deliveryMode: getDeliveryModeForCardKind(value.cardKind),
    deliveryGroupId: value.cardKind === "SHARED_CLASSES"
      ? null
      : value.deliveryGroupId && availableGroupIdSet.has(value.deliveryGroupId)
        ? value.deliveryGroupId
        : null,
    openClassIds: value.cardKind === "ELECTIVE_GROUP"
      ? value.openClassIds.filter((classId) => classIdSet.has(classId))
      : [],
    coveredClassIds: value.cardKind === "SHARED_CLASSES"
      ? value.coveredClassIds.filter((classId) => classIdSet.has(classId))
      : [],
  };
  const availableSubjectIds = getAvailableSubjectIds(
    baseValue,
    context.classRows,
    context.directGroupOptions,
    context.electiveGroupOptions,
  );
  const subjectId = availableSubjectIds.includes(baseValue.subjectId)
    ? baseValue.subjectId
    : availableSubjectIds.length === 1
      ? availableSubjectIds[0]
      : "";
  const normalizedValue = {
    ...baseValue,
    subjectId,
  } satisfies ScheduleStepperFormValue;
  const durationMinutes = getDurationMinutes(normalizedValue, context.lessonDurationByGroupSubject);
  const endMinutes = getDerivedEndMinutes(normalizedValue.startMinutes, durationMinutes);
  const audienceSelection = getAudienceSelection(
    normalizedValue,
    context.classRows,
    context.directGroupOptions,
    context.electiveGroupOptions,
  );
  const availableRooms = getAvailableRoomOptions(context.roomOptions, audienceSelection, subjectId);
  const availableTeachers = getAvailableTeacherOptions(context.teacherOptions, audienceSelection, subjectId);

  return {
    ...normalizedValue,
    dayOfWeek: normalizedValue.dayOfWeek,
    startMinutes: normalizedValue.dayOfWeek === null ? null : normalizedValue.startMinutes,
    endMinutes: normalizedValue.dayOfWeek === null ? null : endMinutes,
    roomId: normalizedValue.roomId && availableRooms.some((room) => room.id === normalizedValue.roomId)
      ? normalizedValue.roomId
      : null,
    teacherId: normalizedValue.teacherId && availableTeachers.some((teacher) => teacher.id === normalizedValue.teacherId)
      ? normalizedValue.teacherId
      : null,
  } satisfies ScheduleStepperFormValue;
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
