"use client";

import type {
  FieldComponent,
  FormAsyncValidateOrFn,
  FormValidateOrFn,
} from "@tanstack/react-form";

import type { ScheduleStepperFormValue } from "../../_lib/schedule-editor-flow";

export type ScheduleEditorFieldRenderer = FieldComponent<
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

export type ScheduleEditorPatchHandler = (
  patch: Partial<ScheduleStepperFormValue>,
) => void;
