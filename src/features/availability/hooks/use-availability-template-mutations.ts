"use client";

import { useCallback } from "react";
import type {
  TeacherAvailabilityTemplateEditorInput,
  UpsertTeacherAvailabilityInput,
} from "@/features/availability/lib/schemas";
import type { AvailabilityTeacher, AvailabilityTemplateEntry } from "@/features/availability/lib/types";
import { useAvailabilityMutationRunner } from "./use-availability-mutation-runner";
import {normalizeTemplateEntries} from "@/features/availability/lib/utils";

export function useAvailabilityTemplateMutations({
  teacher,
  upsertAction,
}: {
  teacher: AvailabilityTeacher;
  upsertAction: (payload: UpsertTeacherAvailabilityInput) => Promise<{ error: string | null }>;
}) {
  const { isMutating, mutate } = useAvailabilityMutationRunner();

  const handleTemplateSave = useCallback(
    async (
      nextEntry: TeacherAvailabilityTemplateEditorInput,
      previousId?: string,
    ) => {
      const nextEntries = normalizeTemplateEntries(
            [
                ...teacher.templateEntries.filter((entry) => entry.id !== previousId),
                nextEntry,
            ].sort((left, right) =>
                left.dayOfWeek !== right.dayOfWeek
                    ? left.dayOfWeek - right.dayOfWeek
                    : left.startTime - right.startTime,
            ),
        );

      return mutate(
        () => upsertAction({ teacherId: teacher.teacherId, entries: nextEntries }),
        previousId ? "Интервал обновлён" : "Интервал добавлен",
      );
    },
    [mutate, teacher.teacherId, teacher.templateEntries, upsertAction],
  );

  const handleTemplateDelete = useCallback(
    async (entry: AvailabilityTemplateEntry) =>
      mutate(
        () =>
          upsertAction({
            teacherId: teacher.teacherId,
            entries: teacher.templateEntries
              .filter((templateEntry) => templateEntry.id !== entry.id),

          }),
        "Интервал удален",
      ),
    [mutate, teacher.teacherId, teacher.templateEntries, upsertAction],
  );

  return {
    isMutating,
    handleTemplateSave,
    handleTemplateDelete,
  };
}
