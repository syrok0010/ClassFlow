"use client";

import { useCallback } from "react";
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
  SubjectWithUsage,
} from "../_lib/types";

export function useSubjectsCrud(initialSubjects: SubjectWithUsage[]) {
  const handleCreateSubject = useCallback(
    async (data: { name: string; type: SubjectType }) => {
      const response = await createSubjectAction(data);
      if (response.error || !response.result) {
        toast.error(response.error);
        return false;
      }

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
    subjects: initialSubjects,
    handleCreateSubject,
    handleRenameSubject,
    handleDeleteSubject,
    loadDeleteGuards,
  };
}
