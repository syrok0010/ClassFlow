"use client";

import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AnyFieldApi } from "@tanstack/react-form";
import { getFirstFieldErrorMessage } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import type { HTMLAttributes, KeyboardEventHandler, Ref } from "react";

interface FormFieldProps {
  field: AnyFieldApi;
  label?: string;
  placeholder?: string;
  type?: string;
  id?: string;
  required?: boolean;
  inputClassName?: string;
  onFieldBlur?: () => void;
  onFieldChange?: (value: string) => void;
  compact?: boolean;
  truncateError?: boolean;
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "id" | "name" | "type" | "placeholder" | "value" | "onBlur" | "onChange" | "disabled" | "className"
  >;
}

export function FormField({ 
  field, 
  label, 
  placeholder, 
  type = "text", 
  id, 
  required,
  inputClassName,
  onFieldBlur,
  onFieldChange,
  compact,
  truncateError,
  inputProps,
}: FormFieldProps) {
  const fieldId = id || field.name;
  const errorMessage = getFirstFieldErrorMessage(field);
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
          id={fieldId}
          name={field.name}
          type={type}
          placeholder={placeholder}
          value={field.state.value as string}
          onBlur={() => {
            field.handleBlur();
            onFieldBlur?.();
          }}
          onChange={(e) => {
            field.handleChange(e.target.value);
            onFieldChange?.(e.target.value);
          }}
          disabled={field.form.state.isSubmitting}
          {...inputProps}
          className={cn(
            hasError ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary",
            inputClassName
          )}
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
