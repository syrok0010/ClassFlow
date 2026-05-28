import type { UseMutationResult } from "@tanstack/react-query";
import type { Result } from "@/lib/result";

export type ActionError = {
  error: string;
};

export type MutationCommand<TVariables, TData = unknown> = Pick<
  UseMutationResult<TData, Error, TVariables>,
  "error" | "isPending" | "mutate" | "mutateAsync" | "reset" | "status" | "variables"
> & {
  execute: (variables: TVariables) => Promise<TData | null>;
};

export function withExecute<TVariables, TData>(
  mutation: UseMutationResult<TData, Error, TVariables>
): MutationCommand<TVariables, TData> {
  return {
    error: mutation.error,
    isPending: mutation.isPending,
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    reset: mutation.reset,
    status: mutation.status,
    variables: mutation.variables,
    execute: async (variables) => {
      try {
        return await mutation.mutateAsync(variables);
      } catch {
        return null;
      }
    },
  };
}

export function assertActionSuccess<T>(response: Result<T>, fallback: string): T;
export function assertActionSuccess<T extends object>(
  response: T,
  fallback: string
): Exclude<T, ActionError>;
export function assertActionSuccess<T>(
  response: Result<T> | T,
  fallback: string
) {
  if (response && typeof response === "object" && "result" in response) {
    if (response.error || response.result === null) {
      throw new Error(response.error ?? fallback);
    }

    return response.result;
  }

  if (response && typeof response === "object" && "error" in response) {
    const message =
      typeof response.error === "string"
        ? response.error
        : fallback;
    throw new Error(message);
  }

  return response as Exclude<T, ActionError>;
}
