"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SubjectType } from "@/generated/prisma/client";
import type { Result } from "@/lib/result";
import {
  createSubjectAction,
  deleteSubjectAction,
  updateSubjectAction,
} from "../_actions/subject-actions";
import type {
  SubjectUsage,
  SubjectWithUsage,
} from "../_lib/types";
import type { CreateSubjectInput } from "@/app/(dashboard)/admin/subjects/_lib/subject-schemas";

type SubjectMutationCommand<TVariables, TData = unknown> = Pick<
  UseMutationResult<TData, Error, TVariables>,
  "error" | "isPending" | "mutate" | "mutateAsync" | "reset" | "status" | "variables"
>;

type CreatedSubject = {
  id: string;
  name: string;
  type: SubjectType;
};

export type RenameSubjectVariables = {
  id: string;
  name: string;
};

export type SubjectsCrudCommands = {
  createSubject: SubjectMutationCommand<CreateSubjectInput, CreatedSubject>;
  renameSubject: SubjectMutationCommand<RenameSubjectVariables>;
  deleteSubject: SubjectMutationCommand<SubjectWithUsage>;
};

type SubjectsCrudState = {
  subjects: SubjectWithUsage[];
  commands: SubjectsCrudCommands;
};

const EMPTY_USAGE: SubjectUsage = {
  roomsCount: 0,
  requirementsCount: 0,
  teachersCount: 0,
  scheduleTemplatesCount: 0,
  scheduleEntriesCount: 0,
};

function assertActionSuccess<T>(response: Result<T>, fallback: string): T {
  if (response.error || response.result === null) {
    throw new Error(response.error ?? fallback);
  }

  return response.result;
}

export function useSubjectsCrud(
  initialSubjects: SubjectWithUsage[]
): SubjectsCrudState {
  const router = useRouter();
  const [subjectsState, setSubjectsState] = useState({
    source: initialSubjects,
    subjects: initialSubjects,
  });

  if (subjectsState.source !== initialSubjects) {
    setSubjectsState({ source: initialSubjects, subjects: initialSubjects });
  }

  const subjects =
    subjectsState.source === initialSubjects
      ? subjectsState.subjects
      : initialSubjects;

  const updateSubjects = useCallback(
    (updater: (current: SubjectWithUsage[]) => SubjectWithUsage[]) => {
      setSubjectsState((current) => {
        const next = updater(current.subjects);
        return { source: current.source, subjects: next };
      });
    },
    []
  );

  const refreshServerState = useCallback(() => router.refresh(), [router]);

  const createSubjectMutation = useMutation<
    CreatedSubject,
    Error, 
    CreateSubjectInput
  >({
    mutationFn: async (data) => {
      const response = await createSubjectAction(data);
      return assertActionSuccess(response, "Не удалось создать предмет");
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (created, data) => {
      updateSubjects((current) => [
        {
          id: created.id,
          name: created.name,
          type: created.type,
          usage: EMPTY_USAGE,
        },
        ...current,
      ]);
      toast.success(`Предмет "${data.name.trim()}" создан`);
    },
    onSettled: refreshServerState,
  });

  const renameSubjectMutation = useMutation<
    unknown,
    Error,
    RenameSubjectVariables
  >({
    mutationFn: async ({ id, name }) => {
      const nextName = name.trim();
      if (!nextName) {
        throw new Error("Название предмета не может быть пустым");
      }

      const response = await updateSubjectAction(id, { name: nextName });
      return assertActionSuccess(response, "Не удалось обновить предмет");
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_result, { id, name }) => {
      const nextName = name.trim();
      updateSubjects((current) =>
        current.map((subject) =>
          subject.id === id ? { ...subject, name: nextName } : subject
        )
      );

      toast.success("Название предмета обновлено");
    },
    onSettled: refreshServerState,
  });

  const deleteSubjectMutation = useMutation<
    unknown,
    Error,
    SubjectWithUsage
  >({
    mutationFn: async (subject) => {
      const response = await deleteSubjectAction(subject.id);
      return assertActionSuccess(response, "Не удалось удалить предмет");
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_result, subject) => {
      updateSubjects((current) =>
        current.filter((item) => item.id !== subject.id)
      );

      toast.success(`Предмет "${subject.name}" удален`);
    },
    onSettled: refreshServerState,
  });

  const commands: SubjectsCrudCommands = {
    createSubject: createSubjectMutation,
    renameSubject: renameSubjectMutation,
    deleteSubject: deleteSubjectMutation,
  };

  return {
    subjects,
    commands,
  };
}
