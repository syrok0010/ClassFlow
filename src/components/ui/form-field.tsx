"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AnyFieldApi } from "@tanstack/react-form";
import { cn } from "@/lib/utils";
import type { HTMLAttributes, KeyboardEventHandler, Ref } from "react";

interface FormFieldProps {
  field: AnyFieldApi;
  label?: string;
  placeholder?: string;
  type?: string;
  id?: string;
  required?: boolean;
  compact?: boolean;
  truncateError?: boolean;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  inputRef?: Ref<HTMLInputElement>;
}

const getErrorMessage = (err: unknown) => {
  if (!err) return null;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && 'message' in err) {
    return (err as { message: string }).message;
  }
  return String(err);
};

export function FormField({ 
  field, 
  label, 
  placeholder, 
  type = "text", 
  id, 
  required,
  compact,
  truncateError,
  inputMode,
  onKeyDown,
  inputRef,
}: FormFieldProps) {
  const fieldId = id || field.name;
  const error = field.state.meta.errors[0];
  const errorMessage = getErrorMessage(error);
  const hasError = field.state.meta.errors.length > 0;

  return (
    <div className={cn("grid", compact ? "gap-0.5" : "gap-1.5")}>
      {label && (
        <Label htmlFor={fieldId}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <div className={cn("grid", compact ? "gap-0.5" : "gap-1")}>
        <Input
          ref={inputRef}
          id={fieldId}
          name={field.name}
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          value={field.state.value === 0 ? "" : String(field.state.value)}
          onBlur={field.handleBlur}
          onKeyDown={onKeyDown}
          onChange={(e) => {
            const val = e.target.value;
            field.handleChange(type === "number" ? (val === "" ? 0 : Number(val)) : val);
          }}
          disabled={field.form.state.isSubmitting}
          className={hasError ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary"}
        />
        {hasError && (
          <span
            className={cn(
              "text-[10px] text-destructive font-medium uppercase tracking-wider animate-in fade-in slide-in-from-top-1 duration-200",
              truncateError && "truncate",
            )}
          >
            {errorMessage}
          </span>
        )}
      </div>
    </div>
  );
}
