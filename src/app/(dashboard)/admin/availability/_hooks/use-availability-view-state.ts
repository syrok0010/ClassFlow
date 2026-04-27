"use client";

import { useState } from "react";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQueryState } from "nuqs";
import type {
  AvailabilityOverrideEntry,
  AvailabilityTeacher,
  AvailabilityTemplateEntry,
} from "../_lib/types";
import { filterTeachers } from "../_components/availability-view-helpers";

export type TemplateDialogState = {
  open: boolean;
  entry: AvailabilityTemplateEntry | null;
};

export type OverrideDialogState = {
  open: boolean;
  entry: AvailabilityOverrideEntry | null;
};

export function useAvailabilityViewState(
  teachers: AvailabilityTeacher[],
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeacherIdsParam, setSelectedTeacherIdsParam] = useQueryState("teachers", {
    defaultValue: "",
    shallow: true,
  });
  const [templateDialog, setTemplateDialog] = useState<TemplateDialogState>({
    open: false,
    entry: null,
  });
  const [overrideDialog, setOverrideDialog] = useState<OverrideDialogState>({
    open: false,
    entry: null,
  });
  const [overrideToDelete, setOverrideToDelete] = useState<AvailabilityOverrideEntry | null>(null);

  const [debouncedSearchQuery] = useDebouncedValue(searchQuery, { wait: 350 });
  const selectedTeacherIds = selectedTeacherIdsParam
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const visibleTeachers = filterTeachers(
    teachers,
    debouncedSearchQuery,
  );
  const selectedTeachers = teachers.filter((teacher) =>
    selectedTeacherIds.includes(teacher.teacherId),
  );

  function toggleTeacherSelection(teacherId: string) {
    const nextSelectedTeacherIds = selectedTeacherIds.includes(teacherId)
      ? selectedTeacherIds.filter((item) => item !== teacherId)
      : [...selectedTeacherIds, teacherId];

    void setSelectedTeacherIdsParam(
      nextSelectedTeacherIds.length > 0 ? nextSelectedTeacherIds.join(",") : null,
    );
  }

  function clearSelection() {
    void setSelectedTeacherIdsParam(null);
  }

  function openTemplateDialog(entry: AvailabilityTemplateEntry | null = null) {
    setTemplateDialog({
      open: true,
      entry,
    });
  }

  function closeTemplateDialog(open: boolean) {
    setTemplateDialog((current) => ({
      ...current,
      open,
      entry: open ? current.entry : null,
    }));
  }

  function openOverrideDialog(entry: AvailabilityOverrideEntry | null = null) {
    setOverrideDialog({ open: true, entry });
  }

  function closeOverrideDialog(open: boolean) {
    setOverrideDialog((current) => ({
      open,
      entry: open ? current.entry : null,
    }));
  }

  return {
    searchQuery,
    selectedTeacherIds,
    selectedTeachers,
    templateDialog,
    overrideDialog,
    overrideToDelete,
    visibleTeachers,
    setSearchQuery,
    setOverrideToDelete,
    toggleTeacherSelection,
    clearSelection,
    openTemplateDialog,
    closeTemplateDialog,
    openOverrideDialog,
    closeOverrideDialog,
  };
}
