"use client";

import { useCallback } from "react";
import type {
  TeacherAvailabilityEntryInput,
  TeacherAvailabilityTemplateEditorInput,
  UpsertTeacherAvailabilityInput,
} from "@/features/availability/lib/schemas";
import type { AvailabilityTeacher, AvailabilityTemplateEntry } from "@/features/availability/lib/types";
import {
  buildEntriesAfterTemplateDelete,
  buildEntriesAfterTemplateSave,
} from "@/features/availability/lib/template-entry-ops";
import { useAvailabilityMutationRunner } from "./use-availability-mutation-runner";

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
      nextEntry: TeacherAvailabilityEntryInput | TeacherAvailabilityTemplateEditorInput,
      previousId?: string,
    ) => {
      const nextEntries = buildEntriesAfterTemplateSave(
        teacher.templateEntries,
        {
          dayOfWeek: nextEntry.dayOfWeek,
          startTime: nextEntry.startTime,
          endTime: nextEntry.endTime,
          type: nextEntry.type,
        },
        previousId,
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
            entries: buildEntriesAfterTemplateDelete(teacher.templateEntries, entry.id),
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
