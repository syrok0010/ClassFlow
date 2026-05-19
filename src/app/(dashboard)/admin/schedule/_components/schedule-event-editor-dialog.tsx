"use client";

import { useMemo, useState } from "react";
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
import { FieldError, FieldGroup } from "@/components/ui/field";

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
  type ScheduleEditorStepId,
  type ScheduleStepperFormValue,
  SCHEDULE_EDITOR_STEPS,
} from "../_lib/schedule-editor-flow";
import { DAY_OPTIONS } from "./schedule-event-editor-dialog-steps/constants";
import { AudienceStep } from "./schedule-event-editor-dialog-steps/audience-step";
import { KindStep } from "./schedule-event-editor-dialog-steps/kind-step";
import { RoomStep } from "./schedule-event-editor-dialog-steps/room-step";
import { SubjectStep } from "./schedule-event-editor-dialog-steps/subject-step";
import { TeacherStep } from "./schedule-event-editor-dialog-steps/teacher-step";
import { TimeStep } from "./schedule-event-editor-dialog-steps/time-step";
import type { ScheduleEditorFieldRenderer } from "./schedule-event-editor-dialog-steps/types";
import type { FilterOption } from "./schedule-multi-select";

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
