"use client";

import { useCallback } from "react";
import type {
  CreateTeacherAvailabilityOverrideInput,
  DeleteTeacherAvailabilityOverrideInput,
  UpdateTeacherAvailabilityOverrideInput,
} from "@/features/availability/lib/schemas";
import type { AvailabilityOverrideEntry } from "@/features/availability/lib/types";
import { useAvailabilityMutationRunner } from "./use-availability-mutation-runner";

export function useAvailabilityOverrideMutations({
  teacherId,
  createAction,
  updateAction,
  deleteAction,
}: {
  teacherId: string;
  createAction: (payload: CreateTeacherAvailabilityOverrideInput) => Promise<{ error: string | null }>;
  updateAction: (payload: UpdateTeacherAvailabilityOverrideInput) => Promise<{ error: string | null }>;
  deleteAction: (payload: DeleteTeacherAvailabilityOverrideInput) => Promise<{ error: string | null }>;
}) {
  const { isMutating, mutate } = useAvailabilityMutationRunner();

  const handleOverrideCreate = useCallback(
    async (payload: CreateTeacherAvailabilityOverrideInput) =>
      mutate(() => createAction(payload), "Исключение добавлено"),
    [createAction, mutate],
  );

  const handleOverrideUpdate = useCallback(
    async (payload: UpdateTeacherAvailabilityOverrideInput) =>
      mutate(() => updateAction(payload), "Исключение обновлено"),
    [mutate, updateAction],
  );

  const handleOverrideDelete = useCallback(
    async (overrideToDelete: AvailabilityOverrideEntry | null) => {
      if (!overrideToDelete) {
        return false;
      }

      return mutate(
        () => deleteAction({ teacherId, overrideId: overrideToDelete.id }),
        "Исключение удалено",
      );
    },
    [deleteAction, mutate, teacherId],
  );

  return {
    isMutating,
    handleOverrideCreate,
    handleOverrideUpdate,
    handleOverrideDelete,
  };
}
