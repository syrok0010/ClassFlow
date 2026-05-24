"use client";

import { useMemo } from "react";
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
  minutesToTime,
  type ScheduleEditorDraft,
  type ScheduleEditorFormContext,
} from "../_lib/schedule-editor-form";
import {
  CARD_KIND_LABELS,
  getAudienceSummaryLabel,
  type ScheduleEditorSubject,
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
import { useScheduleEditorController } from "./use-schedule-editor-controller";

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
  lockDaySelection?: boolean;
  fixedDayLabel?: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: ScheduleEditorDraft) => Promise<string | null>;
}

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
  lockDaySelection = false,
  fixedDayLabel = null,
  onOpenChange,
  onSave,
}: ScheduleEventEditorDialogProps) {
  const formContext = useMemo<ScheduleEditorFormContext>(
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
          formContext={formContext}
          classOptions={classOptions}
          lockDaySelection={lockDaySelection}
          fixedDayLabel={fixedDayLabel}
          onOpenChange={onOpenChange}
          onSave={onSave}
        />
      ) : null}
    </Dialog>
  );
}

type ScheduleEventEditorDialogContentProps = Pick<
  ScheduleEventEditorDialogProps,
  | "title"
  | "description"
  | "classOptions"
  | "lockDaySelection"
  | "fixedDayLabel"
  | "onOpenChange"
  | "onSave"
> & {
  initialValues: ScheduleStepperFormValue;
  formContext: ScheduleEditorFormContext;
};

function ScheduleEventEditorDialogContent({
  title,
  description,
  initialValues,
  formContext,
  classOptions,
  lockDaySelection,
  fixedDayLabel,
  onOpenChange,
  onSave,
}: ScheduleEventEditorDialogContentProps) {
  const controller = useScheduleEditorController({
    initialValues,
    formContext,
    lockDaySelection,
    onOpenChange,
    onSave,
  });
  const { currentStepId, form, submitError } = controller;

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

        <form.Subscribe selector={(state) => state.values}>
          {(values) => {
            const {
              availableSubjectOptions,
              availableRoomOptions,
              availableTeacherOptions,
              durationMinutes,
              stepErrors,
              currentStepError,
              visibleCurrentStepError,
              currentStepIndex,
              canGoPrev,
              nextStepId,
              hasBlockingErrors,
            } = controller.getDerivedState(values);

            return (
              <>
                <EditorProgress
                  currentStepIndex={currentStepIndex}
                  totalSteps={SCHEDULE_EDITOR_STEPS.length}
                />

                <EditorSummaryStrip
                  values={values}
                  classRows={formContext.classRows}
                  directGroupOptions={formContext.directGroupOptions}
                  electiveGroupOptions={formContext.electiveGroupOptions}
                  roomOptions={formContext.roomOptions}
                  teacherOptions={formContext.teacherOptions}
                  subjectOptions={formContext.subjectOptions}
                  durationMinutes={durationMinutes}
                  fixedDayLabel={fixedDayLabel ?? null}
                />

                <CurrentStepContent
                  stepId={currentStepId}
                  FormField={form.Field as unknown as ScheduleEditorFieldRenderer}
                  values={values}
                  classRows={formContext.classRows}
                  classOptions={classOptions}
                  directGroupOptions={formContext.directGroupOptions}
                  electiveGroupOptions={formContext.electiveGroupOptions}
                  subjectOptions={formContext.subjectOptions}
                  availableSubjectOptions={availableSubjectOptions}
                  availableRoomOptions={availableRoomOptions}
                  availableTeacherOptions={availableTeacherOptions}
                  durationMinutes={durationMinutes}
                  stepError={visibleCurrentStepError}
                  lockDaySelection={lockDaySelection ?? false}
                  fixedDayLabel={fixedDayLabel ?? null}
                  onPatch={(patch) => controller.applyPatch(values, patch)}
                />

                {currentStepId === "time" ? (
                  <FinalStepErrors
                    stepErrors={stepErrors}
                  />
                ) : null}

                <DialogFooter className="justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={controller.closeDialog} type="button">
                      Отмена
                    </Button>
                    {canGoPrev ? (
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => controller.goToPreviousStep(currentStepIndex)}
                      >
                        Назад
                      </Button>
                    ) : null}
                  </div>

                  {currentStepIndex < SCHEDULE_EDITOR_STEPS.length - 1 ? (
                    <Button
                      type="button"
                      onClick={() => controller.goToNextStep({ currentStepError, nextStepId })}
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
  lockDaySelection,
  fixedDayLabel,
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
  lockDaySelection: boolean;
  fixedDayLabel: string | null;
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
          lockDaySelection={lockDaySelection}
          fixedDayLabel={fixedDayLabel}
        />
      ) : null}
    </FieldGroup>
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

function getTimeSummaryLabel(
  values: Pick<ScheduleStepperFormValue, "dayOfWeek" | "startMinutes" | "endMinutes">,
  fixedDayLabel: string | null,
) {
  if (values.startMinutes === null) {
    return "Временная область";
  }

  if (values.dayOfWeek === null) {
    return null;
  }

  const dayLabel =
    fixedDayLabel
    ?? DAY_OPTIONS.find((option) => Number(option.value) === values.dayOfWeek)?.label;
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
  fixedDayLabel,
}: {
  values: ScheduleStepperFormValue;
  classRows: AdminScheduleClassRow[];
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  roomOptions: AdminScheduleRoomOption[];
  teacherOptions: AdminScheduleTeacherOption[];
  subjectOptions: ScheduleEditorSubject[];
  durationMinutes: number | null;
  fixedDayLabel: string | null;
}) {
  const audienceLabel = getAudienceSummaryLabel(values, classRows, directGroupOptions, electiveGroupOptions);
  const subjectName = subjectOptions.find((option) => option.id === values.subjectId)?.name ?? null;
  const roomName = roomOptions.find((option) => option.id === values.roomId)?.name ?? null;
  const teacherName = teacherOptions.find((option) => option.id === values.teacherId)?.name ?? null;
  const timeLabel = getTimeSummaryLabel(values, fixedDayLabel);
  const summaryItems = [
    values.cardKind ? CARD_KIND_LABELS[values.cardKind] : null,
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
