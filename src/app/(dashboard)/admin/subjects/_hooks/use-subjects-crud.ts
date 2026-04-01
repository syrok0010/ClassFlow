"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { SubjectType } from "@/generated/prisma/client";
import {
  createSubjectAction,
  deleteSubjectAction,
  getSubjectDeleteGuardsAction,
  updateSubjectAction,
} from "../_actions/subject-actions";
import type {
  SubjectDeleteGuards,
  SubjectUsage,
  SubjectWithUsage,
} from "../_lib/types";

const EMPTY_USAGE: SubjectUsage = {
  roomsCount: 0,
  requirementsCount: 0,
  teachersCount: 0,
  scheduleTemplatesCount: 0,
  scheduleEntriesCount: 0,
};

export function useSubjectsCrud(initialSubjects: SubjectWithUsage[]) {
  const [subjects, setSubjects] = useState(initialSubjects);

  const handleCreateSubject = useCallback(
    async (data: { name: string; type: SubjectType }) => {
      const response = await createSubjectAction(data);
      if (response.error || !response.result) {
        toast.error(response.error);
        return false;
      }

      setSubjects((prev) => [
        {
          id: response.result.id,
          name: response.result.name,
          type: response.result.type,
          usage: EMPTY_USAGE,
        },
        ...prev,
      ]);

      toast.success(`Предмет \"${data.name.trim()}\" создан`);
      return true;
    },
    []
  );

  const handleRenameSubject = useCallback(
    async (id: string, name: string) => {
      const nextName = name.trim();
      if (!nextName) {
        return;
      }

      const response = await updateSubjectAction(id, { name: nextName });
      if (response.error) {
        toast.error(response.error);
        return;
      }

      setSubjects((prev) =>
        prev.map((subject) =>
          subject.id === id ? { ...subject, name: nextName } : subject
        )
      );

      toast.success("Название предмета обновлено");
    },
    []
  );

  const handleDeleteSubject = useCallback(
    async (subject: SubjectWithUsage) => {
      const response = await deleteSubjectAction(subject.id);
      if (response.error) {
        toast.error(response.error);
        return false;
      }

      setSubjects((prev) => prev.filter((item) => item.id !== subject.id));

      toast.success(`Предмет \"${subject.name}\" удален`);
      return true;
    },
    []
  );

  const loadDeleteGuards = useCallback(async (id: string): Promise<SubjectDeleteGuards | null> => {
    const response = await getSubjectDeleteGuardsAction(id);
    if (response.error) {
      toast.error(response.error);
      return null;
    }

    return response.result;
  }, []);

  return {
    subjects,
    handleCreateSubject,
    handleRenameSubject,
    handleDeleteSubject,
    loadDeleteGuards,
  };
}
