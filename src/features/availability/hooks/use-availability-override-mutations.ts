"use client";

import { useCallback } from "react";
import type {
  CreateTeacherAvailabilityOverrideInput,
  UpdateTeacherAvailabilityOverrideInput,
} from "@/features/availability/lib/schemas";
import type { AvailabilityOverrideEntry } from "@/features/availability/lib/types";
import { useAvailabilityMutationRunner } from "./use-availability-mutation-runner";

export function useAvailabilityOverrideMutations({
  createAction,
  updateAction,
  deleteAction,
}: {
  createAction: (
    payload: Pick<CreateTeacherAvailabilityOverrideInput, "startTime" | "endTime" | "type">,
  ) => Promise<{ error: string | null }>;
  updateAction: (
    payload: Pick<
      UpdateTeacherAvailabilityOverrideInput,
      "overrideId" | "startTime" | "endTime" | "type"
    >,
  ) => Promise<{ error: string | null }>;
  deleteAction: (payload: { overrideId: string }) => Promise<{ error: string | null }>;
}) {
  const { isMutating, mutate } = useAvailabilityMutationRunner();

  const handleOverrideCreate = useCallback(
    async (payload: Pick<CreateTeacherAvailabilityOverrideInput, "startTime" | "endTime" | "type">) =>
      mutate(() => createAction(payload), "Исключение добавлено"),
    [createAction, mutate],
  );

  const handleOverrideUpdate = useCallback(
    async (
      payload: Pick<
        UpdateTeacherAvailabilityOverrideInput,
        "overrideId" | "startTime" | "endTime" | "type"
      >,
    ) => mutate(() => updateAction(payload), "Исключение обновлено"),
    [mutate, updateAction],
  );

  const handleOverrideDelete = useCallback(
    async (overrideToDelete: AvailabilityOverrideEntry | null) => {
      if (!overrideToDelete) {
        return false;
      }

      return mutate(
        () => deleteAction({ overrideId: overrideToDelete.id }),
        "Исключение удалено",
      );
    },
    [deleteAction, mutate],
  );

  return {
    isMutating,
    handleOverrideCreate,
    handleOverrideUpdate,
    handleOverrideDelete,
  };
}
