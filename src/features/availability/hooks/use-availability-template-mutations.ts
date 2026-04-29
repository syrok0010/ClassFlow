"use client";

import { useCallback } from "react";
import type {
  TeacherAvailabilityEntryInput,
  TeacherAvailabilityTemplateEditorInput,
} from "@/features/availability/lib/schemas";
import type { AvailabilityTeacher, AvailabilityTemplateEntry } from "@/features/availability/lib/types";
import {
  buildEntriesAfterTemplateDelete,
  buildEntriesAfterTemplateErase,
  buildEntriesAfterTemplateSave,
} from "@/features/availability/lib/template-entry-ops";
import { useAvailabilityMutationRunner } from "./use-availability-mutation-runner";

export function useAvailabilityTemplateMutations({
  teacher,
  supportsErase,
  upsertAction,
}: {
  teacher: AvailabilityTeacher;
  supportsErase: boolean;
  upsertAction: (payload: { entries: TeacherAvailabilityEntryInput[] }) => Promise<{ error: string | null }>;
}) {
  const { isMutating, mutate } = useAvailabilityMutationRunner();

  const handleTemplateSave = useCallback(
    async (
      nextEntry: TeacherAvailabilityEntryInput | TeacherAvailabilityTemplateEditorInput,
      previousId?: string,
    ) => {
      if (nextEntry.type === "ERASE") {
        if (!supportsErase) {
          return false;
        }

        return mutate(
          () => upsertAction({ entries: buildEntriesAfterTemplateErase(teacher.templateEntries, previousId) }),
          "Интервал удалён",
        );
      }

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
        () => upsertAction({ entries: nextEntries }),
        previousId ? "Интервал обновлён" : "Интервал добавлен",
      );
    },
    [mutate, supportsErase, teacher.templateEntries, upsertAction],
  );

  const handleTemplateDelete = useCallback(
    async (entry: AvailabilityTemplateEntry) =>
      mutate(
        () =>
          upsertAction({
            entries: buildEntriesAfterTemplateDelete(teacher.templateEntries, entry.id),
          }),
        supportsErase ? "Интервал удалён" : "Интервал удален",
      ),
    [mutate, supportsErase, teacher.templateEntries, upsertAction],
  );

  return {
    isMutating,
    handleTemplateSave,
    handleTemplateDelete,
  };
}
