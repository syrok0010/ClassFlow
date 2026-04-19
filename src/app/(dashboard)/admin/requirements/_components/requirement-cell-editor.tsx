"use client";

import { useEffect, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
import {
  breakDurationSchema,
  durationMinutesSchema,
  lessonsPerWeekSchema,
  requirementCellFormSchema,
} from "../_lib/requirement-schemas";
import type { RequirementEntry } from "../_lib/types";

type RequirementCellEditorProps = {
  quickInputMode: boolean;
  initial: RequirementEntry | null;
  initialLessons?: number;
  onSave: (payload: {
    lessonsPerWeek: number;
    durationInMinutes: number;
    breakDuration: number;
    advance: "down" | "right" | "left" | "stay";
  }) => void;
  onCancel: () => void;
};

export function RequirementCellEditor({
  quickInputMode,
  initial,
  initialLessons,
  onSave,
  onCancel,
}: RequirementCellEditorProps) {
  const [dirty, setDirty] = useState(() => initialLessons !== undefined);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverContentRef = useRef<HTMLDivElement | null>(null);
  const lessonsInputRef = useRef<HTMLInputElement | null>(null);
  const durationInputRef = useRef<HTMLInputElement | null>(null);
  const breakInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      lessonsInputRef.current?.focus();
      lessonsInputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [quickInputMode]);

  const form = useForm({
    defaultValues: {
      lessons: Number(initialLessons ?? initial?.lessonsPerWeek ?? 0),
      duration: Number(initial?.durationInMinutes ?? 45),
      breakDuration: Number(initial?.breakDuration ?? 10),
    },
    validators: {
      onChange: requirementCellFormSchema,
    },
  });

  const commit = (advance: "down" | "right" | "left" | "stay") => {
    const parsed = requirementCellFormSchema.safeParse(form.state.values);
    if (!parsed.success) {
      return false;
    }

    const values = parsed.data;
    setDirty(false);

    onSave({
      lessonsPerWeek: values.lessons,
      durationInMinutes: values.duration,
      breakDuration: values.breakDuration,
      advance,
    });

    return true;
  };

  useHotkey(
    "Enter",
    (event) => {
      event.preventDefault();
      void commit("down");
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
      if (quickInputMode) {
        event.preventDefault();
        void commit("right");
        return;
      }

      if (document.activeElement === breakInputRef.current) {
        event.preventDefault();
        void commit("right");
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
      if (quickInputMode) {
        event.preventDefault();
        void commit("left");
        return;
      }

      if (document.activeElement === lessonsInputRef.current) {
        event.preventDefault();
        void commit("left");
      }
    },
    {
      target: quickInputMode ? rootRef : popoverContentRef,
      enabled: true,
      preventDefault: false,
    }
  );

  const renderLessonsField = (autoFocus = false) => (
    <form.Field
      name="lessons"
      validators={{
        onChange: lessonsPerWeekSchema,
      }}
    >
      {(field) => (
        <Field data-invalid={field.state.meta.errors.length > 0}>
          <FieldContent>
            <FieldLabel className="text-xs">Часы в неделю</FieldLabel>
              <Input
                ref={lessonsInputRef}
                autoFocus={autoFocus}
              type="number"
              min={0}
              value={Number.isNaN(field.state.value) ? "" : field.state.value}
              onChange={(event) => {
                field.handleChange(event.target.valueAsNumber);
                setDirty(true);
              }}
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

  const renderExpandedFields = () => (
    <FieldGroup className="gap-3">
      {renderLessonsField(true)}

      <form.Field
        name="duration"
        validators={{
          onChange: durationMinutesSchema,
        }}
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
                onChange={(event) => {
                  field.handleChange(event.target.valueAsNumber);
                  setDirty(true);
                }}
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
        validators={{
          onChange: breakDurationSchema,
        }}
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
                onChange={(event) => {
                  field.handleChange(event.target.valueAsNumber);
                  setDirty(true);
                }}
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
  );

  if (quickInputMode) {
    return (
      <div
        ref={rootRef}
        className="absolute inset-0 z-10 flex items-center bg-background p-2 shadow-lg"
        onBlur={(event) => {
          const nextTarget = event.relatedTarget as Node | null;
          if (nextTarget && rootRef.current?.contains(nextTarget)) {
            return;
          }

          if (dirty) {
            void commit("stay");
          }
        }}
      >
        <div className="flex w-full flex-col justify-center gap-2">
          {renderLessonsField(true)}
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
            if (dirty) {
              const saved = commit("stay");
              if (!saved) {
                return;
              }
            }
            onCancel();
          }
        }}
      >
        <PopoverTrigger className="absolute left-1/2 top-1/2 size-px -translate-x-1/2 -translate-y-1/2 opacity-0" />
        <PopoverContent
          ref={popoverContentRef}
          initialFocus={lessonsInputRef}
          side="top"
          align="center"
          sideOffset={10}
          className="w-80 gap-3 p-3"
        >
          {renderExpandedFields()}
        </PopoverContent>
      </Popover>
    </div>
  );
}
