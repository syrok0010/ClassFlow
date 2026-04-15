"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createTeacherAvailabilityOverrideAction,
  deleteTeacherAvailabilityOverrideAction,
  updateTeacherAvailabilityOverrideAction,
  upsertTeacherAvailabilityAction,
} from "../_actions/availability-actions";
import type {
  CreateTeacherAvailabilityOverrideInput,
  TeacherAvailabilityEntryInput,
  UpdateTeacherAvailabilityOverrideInput,
} from "../_lib/schemas";
import type {
  AvailabilityOverrideEntry,
  AvailabilityTeacher,
  AvailabilityTemplateEntry,
} from "../_lib/types";
import { normalizeTemplateEntries, timeToMinutes } from "../_lib/utils";

type UseAvailabilityMutationsOptions = {
  selectedTeacher: AvailabilityTeacher | null;
};

export function useAvailabilityMutations({
  selectedTeacher,
}: UseAvailabilityMutationsOptions) {
  const router = useRouter();
  const [isMutating, setIsMutating] = useState(false);

  const mutate = useCallback(
    async (
      callback: () => Promise<{ error: string | null }>,
      successMessage: string,
    ) => {
      setIsMutating(true);
      const response = await callback();
      setIsMutating(false);

      if (response.error) {
        toast.error(response.error);
        return false;
      }

      router.refresh();
      toast.success(successMessage);
      return true;
    },
    [router],
  );

  const handleTemplateSave = useCallback(
    async (nextEntry: TeacherAvailabilityEntryInput, previousId?: string) => {
      if (!selectedTeacher) {
        return false;
      }

      const nextEntries = normalizeTemplateEntries(
        [
          ...selectedTeacher.templateEntries
            .filter((entry) => entry.id !== previousId)
            .map((entry) => ({
              dayOfWeek: entry.dayOfWeek,
              startTime: entry.startTime,
              endTime: entry.endTime,
              type: entry.type,
            })),
          nextEntry,
        ].sort((left, right) => {
          if (left.dayOfWeek !== right.dayOfWeek) {
            return left.dayOfWeek - right.dayOfWeek;
          }

          return timeToMinutes(left.startTime) - timeToMinutes(right.startTime);
        }),
      );

      return mutate(
        () =>
          upsertTeacherAvailabilityAction({
            teacherId: selectedTeacher.teacherId,
            entries: nextEntries,
          }),
        previousId ? "Интервал обновлен" : "Интервал добавлен",
      );
    },
    [mutate, selectedTeacher],
  );

  const handleTemplateDelete = useCallback(
    async (entry: AvailabilityTemplateEntry) => {
      if (!selectedTeacher) {
        return false;
      }

      const nextEntries = selectedTeacher.templateEntries
        .filter((item) => item.id !== entry.id)
        .map((item) => ({
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          type: item.type,
        }));

      return mutate(
        () =>
          upsertTeacherAvailabilityAction({
            teacherId: selectedTeacher.teacherId,
            entries: nextEntries,
          }),
        "Интервал удален",
      );
    },
    [mutate, selectedTeacher],
  );

  const handleOverrideCreate = useCallback(
    async (payload: CreateTeacherAvailabilityOverrideInput) =>
      mutate(
        () => createTeacherAvailabilityOverrideAction(payload),
        "Исключение добавлено",
      ),
    [mutate],
  );

  const handleOverrideUpdate = useCallback(
    async (payload: UpdateTeacherAvailabilityOverrideInput) =>
      mutate(
        () => updateTeacherAvailabilityOverrideAction(payload),
        "Исключение обновлено",
      ),
    [mutate],
  );

  const handleOverrideDelete = useCallback(
    async (overrideToDelete: AvailabilityOverrideEntry | null) => {
      if (!selectedTeacher || !overrideToDelete) {
        return false;
      }

      return mutate(
        () =>
          deleteTeacherAvailabilityOverrideAction({
            teacherId: selectedTeacher.teacherId,
            overrideId: overrideToDelete.id,
          }),
        "Исключение удалено",
      );
    },
    [mutate, selectedTeacher],
  );

  return {
    isMutating,
    handleTemplateSave,
    handleTemplateDelete,
    handleOverrideCreate,
    handleOverrideUpdate,
    handleOverrideDelete,
  };
}
