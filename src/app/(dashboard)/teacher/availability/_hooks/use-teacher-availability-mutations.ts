"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createTeacherAvailabilityOverrideAction,
  deleteTeacherAvailabilityOverrideAction,
  updateTeacherAvailabilityOverrideAction,
  upsertTeacherAvailabilityAction,
} from "../_actions/teacher-availability-actions";
import type {
  CreateTeacherAvailabilityOverrideActionInput,
  TeacherAvailabilityTemplateEditorInput,
  UpdateTeacherAvailabilityOverrideActionInput,
} from "../_lib/schemas";
import type {
  TeacherAvailabilityEntry,
  TeacherAvailabilityOverride,
  TeacherAvailabilitySelf,
} from "../_lib/types";
import { normalizeTemplateEntries } from "@/features/availability/lib/utils";

type UseTeacherAvailabilityMutationsOptions = {
  teacher: TeacherAvailabilitySelf;
};

function subtractEntry(
  entries: TeacherAvailabilityEntry[],
  target: TeacherAvailabilityEntry,
): Array<Pick<TeacherAvailabilityEntry, "dayOfWeek" | "startTime" | "endTime" | "type">> {
  return entries.flatMap((entry) => {
    if (entry.id !== target.id) {
      return [
        {
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime,
          type: entry.type,
        },
      ];
    }

    return [];
  });
}

export function useTeacherAvailabilityMutations({
  teacher,
}: UseTeacherAvailabilityMutationsOptions) {
  const router = useRouter();
  const [isMutating, setIsMutating] = useState(false);

  const mutate = useCallback(
    async (callback: () => Promise<{ error: string | null }>, successMessage: string) => {
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
    async (nextEntry: TeacherAvailabilityTemplateEditorInput, previousId?: string) => {
      const nextEntries =
        nextEntry.type === "ERASE"
          ? previousId
            ? subtractEntry(
                teacher.templateEntries,
                teacher.templateEntries.find((entry) => entry.id === previousId)!,
              )
            : teacher.templateEntries.map((entry) => ({
                dayOfWeek: entry.dayOfWeek,
                startTime: entry.startTime,
                endTime: entry.endTime,
                type: entry.type,
              }))
          : normalizeTemplateEntries(
              [
                ...teacher.templateEntries
                  .filter((entry) => entry.id !== previousId)
                  .map((entry) => ({
                    dayOfWeek: entry.dayOfWeek,
                    startTime: entry.startTime,
                    endTime: entry.endTime,
                    type: entry.type,
                  })),
                {
                  dayOfWeek: nextEntry.dayOfWeek,
                  startTime: nextEntry.startTime,
                  endTime: nextEntry.endTime,
                  type: nextEntry.type,
                },
              ].sort((left, right) =>
                left.dayOfWeek !== right.dayOfWeek
                  ? left.dayOfWeek - right.dayOfWeek
                  : left.startTime - right.startTime,
              ),
            );

      return mutate(
        () => upsertTeacherAvailabilityAction({ entries: nextEntries }),
        nextEntry.type === "ERASE"
          ? "Интервал удалён"
          : previousId
            ? "Интервал обновлён"
            : "Интервал добавлен",
      );
    },
    [mutate, teacher.templateEntries],
  );

  const handleTemplateDelete = useCallback(
    async (entry: TeacherAvailabilityEntry) => {
      const nextEntries = teacher.templateEntries
        .filter((item) => item.id !== entry.id)
        .map((item) => ({
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          type: item.type,
        }));

      return mutate(
        () => upsertTeacherAvailabilityAction({ entries: nextEntries }),
        "Интервал удалён",
      );
    },
    [mutate, teacher.templateEntries],
  );

  const handleOverrideCreate = useCallback(
    async (payload: CreateTeacherAvailabilityOverrideActionInput) =>
      mutate(
        () => createTeacherAvailabilityOverrideAction(payload),
        "Исключение добавлено",
      ),
    [mutate],
  );

  const handleOverrideUpdate = useCallback(
    async (payload: UpdateTeacherAvailabilityOverrideActionInput) =>
      mutate(
        () => updateTeacherAvailabilityOverrideAction(payload),
        "Исключение обновлено",
      ),
    [mutate],
  );

  const handleOverrideDelete = useCallback(
    async (overrideToDelete: TeacherAvailabilityOverride | null) => {
      if (!overrideToDelete) {
        return false;
      }

      return mutate(
        () => deleteTeacherAvailabilityOverrideAction({ overrideId: overrideToDelete.id }),
        "Исключение удалено",
      );
    },
    [mutate],
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
