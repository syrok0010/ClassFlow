import { z } from "zod/v4";
import { rethrowIfNextControlFlow } from "@/lib/server-action-auth/next-control-flow";

export function getActionErrorMessage(error: unknown, fallback: string): string {
  rethrowIfNextControlFlow(error);

  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
