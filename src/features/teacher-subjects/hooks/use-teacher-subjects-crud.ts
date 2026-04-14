"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  createTeacherSubjectAction,
  deleteTeacherSubjectAction,
  updateTeacherSubjectAction,
} from "../actions/teacher-subject-actions";
import type {
  CreateTeacherSubjectFormInput,
  UpdateTeacherSubjectInput,
} from "../lib/schemas";
import type {
  SubjectOption,
  TeacherSubjectRow,
  TeacherSubjectSummary,
} from "../lib/types";
import { getTeacherSubjectsSummary } from "../lib/teacher-subject-table-utils";

export function useTeacherSubjectsCrud(initialRows: TeacherSubjectRow[], teacherId: string) {
  const [rows, setRows] = useState(initialRows);

  const handleCreateTeacherSubject = useCallback(
    async (payload: CreateTeacherSubjectFormInput, subjectOptions: SubjectOption[]) => {
      const subject = subjectOptions.find((option) => option.id === payload.subjectId);
      if (!subject) {
        toast.error("Выберите предмет");
        return false;
      }

      const response = await createTeacherSubjectAction({
        teacherId,
        subjectId: payload.subjectId,
        minGrade: payload.minGrade,
        maxGrade: payload.maxGrade,
      });

      if (response.error || !response.result) {
        toast.error(response.error ?? "Не удалось добавить компетенцию");
        return false;
      }

      setRows((prev) => [response.result, ...prev]);
      toast.success("Компетенция добавлена");
      return true;
    },
    [teacherId]
  );

  const handleUpdateTeacherSubject = useCallback(
    async (row: TeacherSubjectRow, payload: UpdateTeacherSubjectInput) => {
      const response = await updateTeacherSubjectAction(
        {
          teacherId: row.teacherId,
          subjectId: row.subjectId,
          minGrade: payload.minGrade,
          maxGrade: payload.maxGrade,
        },
      );

      if (response.error || !response.result) {
        toast.error(response.error ?? "Не удалось обновить диапазон");
        return false;
      }

      setRows((prev) =>
        prev.map((item) =>
          item.subjectId === row.subjectId && item.teacherId === row.teacherId ? response.result : item
        )
      );
      toast.success("Диапазон классов обновлен");
      return true;
    },
    []
  );

  const handleDeleteTeacherSubject = useCallback(async (row: TeacherSubjectRow) => {
    const response = await deleteTeacherSubjectAction({
      teacherId: row.teacherId,
      subjectId: row.subjectId,
    });

    if (response.error) {
      toast.error(response.error);
      return false;
    }

    setRows((prev) =>
      prev.filter((item) => !(item.subjectId === row.subjectId && item.teacherId === row.teacherId))
    );
    toast.success("Компетенция удалена");
    return true;
  }, []);

  const summary: TeacherSubjectSummary = getTeacherSubjectsSummary(rows);

  return {
    rows,
    summary,
    handleCreateTeacherSubject,
    handleUpdateTeacherSubject,
    handleDeleteTeacherSubject,
  };
}
