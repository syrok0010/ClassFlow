import type { AnyFieldApi } from "@tanstack/react-form";

function toErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    return message ?? null;
  }

  return String(error);
}

export function getFieldErrorMessages(field: AnyFieldApi): string[] {
  const messages = field.state.meta.errors
    .flatMap((error) => {
      const message = toErrorMessage(error);
      return message ? [message] : [];
    })
    .filter(Boolean);

  return Array.from(new Set(messages));
}

export function getFirstFieldErrorMessage(field: AnyFieldApi): string | null {
  return getFieldErrorMessages(field)[0] ?? null;
}
