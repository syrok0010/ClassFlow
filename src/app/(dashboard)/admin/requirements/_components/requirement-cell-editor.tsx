import { useEffect, useRef } from "react";
import { useForm } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requirementCellFormSchema } from "../_lib/schemas";
import type { 
  RequirementCellFormInput, 
  RequirementEntry,
  NavigationDirection 
} from "../_lib/types";

type RequirementCellEditorProps = {
  quickInputMode: boolean;
  initial: RequirementEntry | null;
  initialLessons?: number;
  onSave: (payload: RequirementCellFormInput & { advance: NavigationDirection }) => void;
  onCancel: () => void;
};

export function RequirementCellEditor({
  quickInputMode,
  initial,
  initialLessons,
  onSave,
  onCancel,
}: RequirementCellEditorProps) {
  const advanceRef = useRef<NavigationDirection>("stay");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverContentRef = useRef<HTMLDivElement | null>(null);
  const lessonsInputRef = useRef<HTMLInputElement | null>(null);
  const durationInputRef = useRef<HTMLInputElement | null>(null);
  const breakInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm({
    defaultValues: {
      lessonsPerWeek: initial?.lessonsPerWeek ?? 0,
      durationInMinutes: initial?.durationInMinutes ?? 45,
      breakDuration: initial?.breakDuration ?? 10,
    },
    onSubmit: ({ value }) => {
      onSave({ ...value, advance: advanceRef.current });
    },
  });

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      lessonsInputRef.current?.focus();
      lessonsInputRef.current?.select();
    });

    if (initialLessons)
    {
      form.setFieldValue("lessonsPerWeek", initialLessons)
    }

    return () => window.cancelAnimationFrame(frameId);
  }, [form, initialLessons]);

  const triggerSubmit = (advance: NavigationDirection) => {
    advanceRef.current = advance;
    void form.handleSubmit();
  };

  useHotkey(
    "Enter",
    (event) => {
      event.preventDefault();
      triggerSubmit("down");
    },
    {
      target: quickInputMode ? rootRef : popoverContentRef,
      enabled: true,
      preventDefault: true,
    }
  );

  useHotkey(
    "Escape",
    (event) => {
      event.preventDefault();
      onCancel();
    },
    {
      target: quickInputMode ? rootRef : popoverContentRef,
      enabled: true,
      preventDefault: true,
    }
  );

  useHotkey(
    "Tab",
    (event) => {
      if (quickInputMode || document.activeElement === breakInputRef.current) {
        event.preventDefault();
        triggerSubmit("right");
      }
    },
    {
      target: quickInputMode ? rootRef : popoverContentRef,
      enabled: true,
      preventDefault: false,
    }
  );

  useHotkey(
    "Shift+Tab",
    (event) => {
      if (quickInputMode || document.activeElement === lessonsInputRef.current) {
        event.preventDefault();
        triggerSubmit("left");
      }
    },
    {
      target: quickInputMode ? rootRef : popoverContentRef,
      enabled: true,
      preventDefault: false,
    }
  );

  const renderLessonsField = () => (
    <form.Field
      name="lessonsPerWeek"
      validators={{ onChange: requirementCellFormSchema.shape.lessonsPerWeek }}
    >
      {(field) => (
        <Field data-invalid={field.state.meta.errors.length > 0}>
          <FieldContent>
            <FieldLabel className="text-xs">Часы в неделю</FieldLabel>
            <Input
              ref={lessonsInputRef}
              type="number"
              min={0}
              value={Number.isNaN(field.state.value) ? "" : field.state.value}
              onChange={(event) => field.handleChange(event.target.valueAsNumber)}
              onBlur={field.handleBlur}
              placeholder="Часы"
              className="h-7"
            />
            <FieldError errors={field.state.meta.errors} className="text-[10px]" />
          </FieldContent>
        </Field>
      )}
    </form.Field>
  );

  if (quickInputMode) {
    return (
      <div
        ref={rootRef}
        className="absolute inset-0 z-10 flex items-center bg-background p-2 shadow-lg"
        onBlur={(e) => {
          if (!rootRef.current?.contains(e.relatedTarget as Node)) {
            if (form.state.isDirty) {
              void triggerSubmit("stay");
            } else {
              onCancel();
            }
          }
        }}
      >
        <div className="flex w-full flex-col justify-center gap-2">
          {renderLessonsField()}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20">
      <Popover
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            if (form.state.isDirty) {
              triggerSubmit("stay");
            } else {
              onCancel();
            }
          }
        }}
      >
        <PopoverTrigger className="absolute left-1/2 top-1/2 size-px -translate-x-1/2 -translate-y-1/2 opacity-0" />
        <PopoverContent
          ref={popoverContentRef}
          side="top"
          align="center"
          sideOffset={10}
          className="w-80 gap-3 p-3"
        >
          <FieldGroup className="gap-3">
            {renderLessonsField()}

            <form.Field
              name="durationInMinutes"
              validators={{ onChange: requirementCellFormSchema.shape.durationInMinutes }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldContent>
                    <FieldLabel className="text-xs">Длительность (мин)</FieldLabel>
                    <Input
                      ref={durationInputRef}
                      type="number"
                      min={1}
                      value={Number.isNaN(field.state.value) ? "" : field.state.value}
                      onChange={(event) => field.handleChange(event.target.valueAsNumber)}
                      onBlur={field.handleBlur}
                      placeholder="Мин"
                      className="h-7"
                    />
                    <FieldError errors={field.state.meta.errors} className="text-[10px]" />
                  </FieldContent>
                </Field>
              )}
            </form.Field>

            <form.Field
              name="breakDuration"
              validators={{ onChange: requirementCellFormSchema.shape.breakDuration }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldContent>
                    <FieldLabel className="text-xs">Перемена (мин)</FieldLabel>
                    <Input
                      ref={breakInputRef}
                      type="number"
                      min={0}
                      value={Number.isNaN(field.state.value) ? "" : field.state.value}
                      onChange={(event) => field.handleChange(event.target.valueAsNumber)}
                      onBlur={field.handleBlur}
                      placeholder="Перемена"
                      className="h-7"
                    />
                    <FieldError errors={field.state.meta.errors} className="text-[10px]" />
                  </FieldContent>
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </PopoverContent>
      </Popover>
    </div>
  );
}
