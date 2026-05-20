"use client";

import { useForm } from "@tanstack/react-form";
import { format, parse } from "date-fns";
import { CalendarCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useLatestAsyncDebouncer } from "@/hooks/use-latest-async-debouncer";
import { getFieldErrorMessages } from "@/lib/form-errors";

import {
  applyWeeklyScheduleTemplateAction,
  getWeeklyScheduleTemplateApplyValidationAction,
  getWeeklyScheduleTemplateApplyPreviewAction,
} from "../_actions/apply-schedule-template-action";
import {
  applyWeeklyScheduleTemplateEditorSchema,
  mapApplyTemplateEditorToActionInput,
  type ApplyWeeklyScheduleTemplateEditorInput,
  type ApplyWeeklyScheduleTemplateInput,
} from "../_lib/apply-schedule-template-schema";

const DATE_FORMAT = "yyyy-MM-dd";

type PreviewState =
  | {
      key: string;
      status: "loading";
    }
  | {
      key: string;
      status: "success";
      existingEntriesCount: number;
    }
  | {
      key: string;
      status: "error";
      error: string;
    };

type TemplateValidationState =
  | {
      status: "loading";
    }
  | {
      status: "success";
      isValid: boolean;
      errorMessages: string[];
    }
  | {
      status: "error";
      error: string;
    };

export function ApplyTemplateDialogButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isApplying, setIsApplying] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [templateValidation, setTemplateValidation] = useState<TemplateValidationState | null>(null);
  const [pendingApplyInput, setPendingApplyInput] =
    useState<ApplyWeeklyScheduleTemplateInput | null>(null);
  const templateValidationLoader = useLatestAsyncDebouncer(
    async () => getWeeklyScheduleTemplateApplyValidationAction(),
    {
      onSuccess: (response) => {
        if (response.result === null) {
          setTemplateValidation({
            status: "error",
            error: response.error ?? "Не удалось проверить недельный шаблон",
          });
          return;
        }

        setTemplateValidation({
          status: "success",
          isValid: response.result.isValid,
          errorMessages: response.result.errorMessages,
        });
      },
      onError: () => {
        setTemplateValidation({
          status: "error",
          error: "Не удалось проверить недельный шаблон",
        });
      },
    },
  );
  const previewLoader = useLatestAsyncDebouncer(
    async (input: ApplyWeeklyScheduleTemplateInput, key: string) => {
      void key;
      return getWeeklyScheduleTemplateApplyPreviewAction(input);
    },
    {
      onSuccess: (response, [, key]) => {
        if (response.result === null) {
          setPreview({
            key,
            status: "error",
            error: response.error ?? "Не удалось проверить период расписания",
          });
          return;
        }

        setPreview({
          key,
          status: "success",
          existingEntriesCount: response.result.existingEntriesCount,
        });
      },
      onError: (_error, [, key]) => {
        setPreview({
          key,
          status: "error",
          error: "Не удалось проверить период расписания",
        });
      },
    },
  );

  const disabled = isPending || isApplying;
  const form = useForm({
    defaultValues: getDefaultValues(),
    validators: {
      onChange: applyWeeklyScheduleTemplateEditorSchema,
      onSubmit: applyWeeklyScheduleTemplateEditorSchema,
    },
    onSubmit: ({ value }) => {
      if (!isTemplateValidationReady(templateValidation)) {
        toast.error("Дождитесь проверки недельного шаблона");
        return;
      }

      if (!templateValidation.isValid) {
        toast.error("Недельный шаблон содержит ошибки и не может быть применен");
        return;
      }

      if (!isPreviewReady(value, preview)) {
        toast.error("Дождитесь проверки периода расписания");
        return;
      }

      const parsed = applyWeeklyScheduleTemplateEditorSchema.parse(value);
      const currentPreview = getCurrentPreview(parsed, preview);
      const input = mapApplyTemplateEditorToActionInput(parsed);

      if (currentPreview && currentPreview.existingEntriesCount > 0) {
        setPendingApplyInput(input);
        return;
      }

      submit(input);
    },
  });

  function resetState() {
    form.reset(getDefaultValues());
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      requestTemplateValidation();
      requestPreview(form.state.values);
      return;
    }

    templateValidationLoader.cancel();
    previewLoader.cancel();
    setTemplateValidation(null);
    setPreview(null);
    setPendingApplyInput(null);
    resetState();
  }

  function handleDateChange(
    field: {
      handleChange: (value: string) => void;
    },
    fieldName: keyof ApplyWeeklyScheduleTemplateEditorInput,
    value: string,
  ) {
    field.handleChange(value);
    requestPreview({
      ...form.state.values,
      [fieldName]: value,
    });
  }

  function requestPreview(values: ApplyWeeklyScheduleTemplateEditorInput) {
    const parsed = applyWeeklyScheduleTemplateEditorSchema.safeParse(values);

    if (!parsed.success) {
      previewLoader.cancel();
      setPreview(null);
      return;
    }

    const key = getPreviewKey(parsed.data);
    setPreview({ key, status: "loading" });
    previewLoader.execute(mapApplyTemplateEditorToActionInput(parsed.data), key);
  }

  function requestTemplateValidation() {
    setTemplateValidation({ status: "loading" });
    templateValidationLoader.execute();
  }

  function submit(input: ApplyWeeklyScheduleTemplateInput) {
    setIsApplying(true);

    startTransition(async () => {
      const response = await applyWeeklyScheduleTemplateAction(input);
      setIsApplying(false);

      if (response.result === null) {
        toast.error(response.error ?? "Не удалось применить недельный шаблон расписания");
        return;
      }

      const result = response.result;
      toast.success(getSuccessMessage(result));
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => handleOpenChange(true)}>
        <CalendarCheckIcon data-icon="inline-start" />
        Применить шаблон
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>Применить недельный шаблон</DialogTitle>
              <DialogDescription>
                Выберите период, за который нужно создать фактические записи расписания.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <form.Field name="startDate">
                {(field) => {
                  const errors = getFieldErrorMessages(field);

                  return (
                    <Field data-invalid={errors.length > 0}>
                      <FieldLabel htmlFor="apply-template-start-date">Дата начала</FieldLabel>
                      <Input
                        id="apply-template-start-date"
                        name={field.name}
                        type="date"
                        value={field.state.value}
                        disabled={disabled}
                        aria-invalid={errors.length > 0 || undefined}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          handleDateChange(field, "startDate", event.currentTarget.value)
                        }
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
                      <FieldLabel htmlFor="apply-template-end-date">Дата окончания</FieldLabel>
                      <Input
                        id="apply-template-end-date"
                        name={field.name}
                        type="date"
                        value={field.state.value}
                        disabled={disabled}
                        aria-invalid={errors.length > 0 || undefined}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          handleDateChange(field, "endDate", event.currentTarget.value)
                        }
                      />
                      {errors.length > 0 ? <FieldError>{errors[0]}</FieldError> : null}
                    </Field>
                  );
                }}
              </form.Field>
            </div>

            <form.Subscribe selector={(state) => state.values}>
              {(values) => <ApplyTemplatePreview values={values} preview={preview} />}
            </form.Subscribe>

            <ApplyTemplateValidationNotice validation={templateValidation} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={disabled}>
                Отмена
              </Button>
              <form.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                  values: state.values,
                })}
              >
                {({ canSubmit, isSubmitting, values }) => (
                  <Button
                    type="submit"
                    disabled={
                      disabled ||
                      isSubmitting ||
                      !canSubmit ||
                      !isPreviewReady(values, preview) ||
                      !isTemplateValidationReadyForApply(templateValidation)
                    }
                  >
                    {disabled || isSubmitting ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <CalendarCheckIcon data-icon="inline-start" />
                    )}
                    {disabled || isSubmitting ? "Применение..." : "Применить"}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingApplyInput !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingApplyInput(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Перезаписать расписание за период?</AlertDialogTitle>
            <AlertDialogDescription>
              В выбранном периоде уже есть {getPendingOverwriteCount(form.state.values, preview)}{" "}
              записей. При подтверждении они будут полностью удалены и созданы заново по текущему
              недельному шаблону.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabled}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={disabled}
              onClick={() => {
                if (!pendingApplyInput) {
                  return;
                }

                const input = pendingApplyInput;
                setPendingApplyInput(null);
                submit(input);
              }}
            >
              {disabled ? <Spinner data-icon="inline-start" /> : null}
              Перезаписать
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ApplyTemplatePreview({
  values,
  preview,
}: {
  values: ApplyWeeklyScheduleTemplateEditorInput;
  preview: PreviewState | null;
}) {
  const parsedValues = applyWeeklyScheduleTemplateEditorSchema.safeParse(values);

  if (!parsedValues.success) {
    return null;
  }

  const previewKey = getPreviewKey(parsedValues.data);
  const currentPreview = preview?.key === previewKey ? preview : null;

  if (currentPreview?.status === "error") {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {currentPreview.error}
      </p>
    );
  }

  if (!currentPreview || currentPreview.status === "loading") {
    return (
      <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        Проверка периода...
      </p>
    );
  }

  if (currentPreview.existingEntriesCount === 0) {
    return (
      <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        В выбранном периоде нет записей для перезаписи.
      </p>
    );
  }

  return (
    <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
      Будет перезаписано записей: {currentPreview.existingEntriesCount}
    </p>
  );
}

function ApplyTemplateValidationNotice({
  validation,
}: {
  validation: TemplateValidationState | null;
}) {
  if (!validation || validation.status === "loading") {
    return (
      <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        Проверка недельного шаблона...
      </p>
    );
  }

  if (validation.status === "error") {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {validation.error}
      </p>
    );
  }

  if (validation.isValid) {
    return (
      <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-200">
        Недельный шаблон прошел проверку и готов к применению.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <p className="font-medium">Недельный шаблон содержит ошибки и не может быть применен:</p>
      <ul className="mt-2 list-disc pl-5">
        {validation.errorMessages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}

function getPreviewKey(value: ApplyWeeklyScheduleTemplateEditorInput) {
  return `${value.startDate}:${value.endDate}`;
}

function isPreviewReady(
  values: ApplyWeeklyScheduleTemplateEditorInput,
  preview: PreviewState | null,
) {
  const parsed = applyWeeklyScheduleTemplateEditorSchema.safeParse(values);

  return parsed.success && getCurrentPreview(parsed.data, preview) !== null;
}

function getCurrentPreview(
  values: ApplyWeeklyScheduleTemplateEditorInput,
  preview: PreviewState | null,
) {
  return preview?.key === getPreviewKey(values) && preview.status === "success"
    ? preview
    : null;
}

function isTemplateValidationReady(
  validation: TemplateValidationState | null,
): validation is Extract<TemplateValidationState, { status: "success" }> {
  return validation?.status === "success";
}

function isTemplateValidationReadyForApply(validation: TemplateValidationState | null) {
  return isTemplateValidationReady(validation) && validation.isValid;
}

function getPendingOverwriteCount(
  values: ApplyWeeklyScheduleTemplateEditorInput,
  preview: PreviewState | null,
) {
  const parsed = applyWeeklyScheduleTemplateEditorSchema.safeParse(values);

  if (!parsed.success) {
    return 0;
  }

  return getCurrentPreview(parsed.data, preview)?.existingEntriesCount ?? 0;
}

function getDefaultValues(): ApplyWeeklyScheduleTemplateEditorInput {
  const today = format(new Date(), DATE_FORMAT);

  return {
    startDate: today,
    endDate: today,
  };
}

function getSuccessMessage(result: {
  createdEntriesCount: number;
  deletedEntriesCount: number;
  startDate: string;
  endDate: string;
}) {
  const periodLabel = formatPeriodLabel(result.startDate, result.endDate);

  if (result.deletedEntriesCount > 0) {
    return `Расписание создано: ${result.createdEntriesCount} записей, перезаписано: ${result.deletedEntriesCount}, период ${periodLabel}`;
  }

  return `Расписание создано: ${result.createdEntriesCount} записей, период ${periodLabel}`;
}

function formatPeriodLabel(startDate: string, endDate: string) {
  return `${formatDateLabel(startDate)}-${formatDateLabel(endDate)}`;
}

function formatDateLabel(value: string) {
  return format(parse(value, DATE_FORMAT, new Date()), "dd.MM.yyyy");
}
