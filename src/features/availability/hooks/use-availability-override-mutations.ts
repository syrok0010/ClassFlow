"use client";

import { useCallback } from "react";
import type {
  TeacherCreateAvailabilityOverrideInput,
  TeacherDeleteAvailabilityOverrideInput,
  TeacherUpdateAvailabilityOverrideInput,
} from "@/features/availability/lib/schemas";
import type { AvailabilityOverrideEntry } from "@/features/availability/lib/types";
import { useAvailabilityMutationRunner } from "./use-availability-mutation-runner";

export function useAvailabilityOverrideMutations({
  createAction,
  updateAction,
  deleteAction,
}: {
  createAction: (payload: TeacherCreateAvailabilityOverrideInput) => Promise<{ error: string | null }>;
  updateAction: (payload: TeacherUpdateAvailabilityOverrideInput) => Promise<{ error: string | null }>;
  deleteAction: (payload: TeacherDeleteAvailabilityOverrideInput) => Promise<{ error: string | null }>;
}) {
  const { isMutating, mutate } = useAvailabilityMutationRunner();

  const handleOverrideCreate = useCallback(
    async (payload: TeacherCreateAvailabilityOverrideInput) =>
      mutate(() => createAction(payload), "Исключение добавлено"),
    [createAction, mutate],
  );

  const handleOverrideUpdate = useCallback(
    async (payload: TeacherUpdateAvailabilityOverrideInput) =>
      mutate(() => updateAction(payload), "Исключение обновлено"),
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
