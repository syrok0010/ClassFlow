import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";

import {
  buildScheduleEditorDerivedState,
  createScheduleEditorFormSchema,
  getInitialScheduleEditorStepId,
  normalizeScheduleEditorValue,
  toTemplateMutationInput,
  type ScheduleEditorDraft,
  type ScheduleEditorFormContext,
} from "../_lib/schedule-editor-form";
import {
  type ScheduleEditorStepId,
  type ScheduleStepperFormValue,
  SCHEDULE_EDITOR_STEPS,
} from "../_lib/schedule-editor-flow";

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

type UseScheduleEditorControllerProps = {
  initialValues: ScheduleStepperFormValue;
  formContext: ScheduleEditorFormContext;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: ScheduleEditorDraft) => Promise<string | null>;
};

export function useScheduleEditorController({
  initialValues,
  formContext,
  onOpenChange,
  onSave,
}: UseScheduleEditorControllerProps) {
  const validationSchema = useMemo(
    () => createScheduleEditorFormSchema(formContext),
    [formContext],
  );
  const [currentStepId, setCurrentStepId] = useState<ScheduleEditorStepId>(
    initialValues.templateId
      ? getInitialScheduleEditorStepId(initialValues, formContext)
      : "kind",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attemptedStepIds, setAttemptedStepIds] = useState<Set<ScheduleEditorStepId>>(
    () => new Set(),
  );

  const form = useForm({
    defaultValues: initialValues satisfies ScheduleStepperFormValue,
    validators: {
      onChange: validationSchema,
      onBlur: validationSchema,
      onSubmit: validationSchema,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);

      const error = await onSave(toTemplateMutationInput(value));
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

  return {
    form,
    currentStepId,
    submitError,
    closeDialog() {
      onOpenChange(false);
    },
    getDerivedState(values: ScheduleStepperFormValue) {
      return buildScheduleEditorDerivedState({
        value: values,
        context: formContext,
        currentStepId,
        attemptedStepIds,
      });
    },
    applyPatch(
      values: ScheduleStepperFormValue,
      patch: Partial<ScheduleStepperFormValue>,
    ) {
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
    },
    goToPreviousStep(currentStepIndex: number) {
      const previousStepId = SCHEDULE_EDITOR_STEPS[currentStepIndex - 1]?.id;
      if (previousStepId) {
        setCurrentStepId(previousStepId);
      }
    },
    goToNextStep({
      currentStepError,
      nextStepId,
    }: {
      currentStepError: string | null;
      nextStepId: ScheduleEditorStepId | null;
    }) {
      if (currentStepError !== null) {
        setAttemptedStepIds((previous) => new Set(previous).add(currentStepId));
        return;
      }

      if (nextStepId) {
        setCurrentStepId(nextStepId);
      }
    },
  };
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
