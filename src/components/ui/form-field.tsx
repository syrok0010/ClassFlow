"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AnyFieldApi } from "@tanstack/react-form";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  field: AnyFieldApi;
  label?: string;
  placeholder?: string;
  type?: string;
  id?: string;
  required?: boolean;
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
  required 
}: FormFieldProps) {
  const fieldId = id || field.name;
  const error = field.state.meta.errors[0];
  const errorMessage = getErrorMessage(error);
  const hasError = field.state.meta.errors.length > 0;

  return (
    <div className="grid gap-1.5">
      {label && (
        <Label htmlFor={fieldId}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <div className="grid gap-1">
        <Input
          id={fieldId}
          name={field.name}
          type={type}
          placeholder={placeholder}
          value={field.state.value === 0 ? "" : String(field.state.value)}
          onBlur={field.handleBlur}
          onChange={(e) => {
            const val = e.target.value;
            field.handleChange(type === "number" ? (val === "" ? 0 : Number(val)) : val);
          }}
          disabled={field.form.state.isSubmitting}
          className={cn(
            hasError ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary"
          )}
        />
        {hasError && (
          <span className="text-[10px] text-destructive font-medium uppercase tracking-wider animate-in fade-in slide-in-from-top-1 duration-200">
            {errorMessage}
          </span>
        )}
      </div>
    </div>
  );
}
