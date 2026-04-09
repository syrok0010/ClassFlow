"use client";

import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AnyFieldApi } from "@tanstack/react-form";
import { getFirstFieldErrorMessage } from "@/lib/form-errors";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  field: AnyFieldApi;
  label?: string;
  placeholder?: string;
  type?: string;
  id?: string;
  required?: boolean;
  inputClassName?: string;
  compact?: boolean;
  truncateError?: boolean;
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "id" | "name" | "type" | "placeholder" | "value" | "disabled" | "className"
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
  compact,
  truncateError,
  inputProps,
}: FormFieldProps) {
  const fieldId = id || field.name;
  const errorMessage = getFirstFieldErrorMessage(field);
  const hasError = field.state.meta.errors.length > 0;
  const { onBlur, onChange, ...restInputProps } = inputProps ?? {};

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
          onBlur={(event) => {
            field.handleBlur();
            onBlur?.(event);
          }}
          onChange={(e) => {
            if (type === "number") {
              field.handleChange(e.target.valueAsNumber);
            } else {
              field.handleChange(e.target.value);
            }
            onChange?.(e);
          }}
          disabled={field.form.state.isSubmitting}
          {...restInputProps}
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
