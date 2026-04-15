"use client";

import { useDeferredValue, useState } from "react";
import { useQueryState } from "nuqs";
import type {
  AvailabilityOverrideEntry,
  AvailabilityTeacher,
  AvailabilityTemplateEntry,
} from "../_lib/types";
import {
  filterTeachers,
  type PanelMode,
} from "../_components/availability-view-helpers";

export type TemplateDialogState = {
  open: boolean;
  dayOfWeek: number;
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
  const [mode, setMode] = useState<PanelMode>("view");
  const [templateDialog, setTemplateDialog] = useState<TemplateDialogState>({
    open: false,
    dayOfWeek: 1,
    entry: null,
  });
  const [overrideDialog, setOverrideDialog] = useState<OverrideDialogState>({
    open: false,
    entry: null,
  });
  const [overrideToDelete, setOverrideToDelete] = useState<AvailabilityOverrideEntry | null>(null);

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const selectedTeacherIds = selectedTeacherIdsParam
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const visibleTeachers = filterTeachers(
    teachers,
    deferredSearchQuery,
  );
  const selectedTeachers = teachers.filter((teacher) =>
    selectedTeacherIds.includes(teacher.teacherId),
  );
  const effectiveMode: PanelMode = selectedTeachers.length === 1 ? mode : "view";

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

  function openTemplateDialog(dayOfWeek: number, entry: AvailabilityTemplateEntry | null = null) {
    setTemplateDialog({
      open: true,
      dayOfWeek: entry?.dayOfWeek ?? dayOfWeek,
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
    effectiveMode,
    templateDialog,
    overrideDialog,
    overrideToDelete,
    visibleTeachers,
    setSearchQuery,
    setMode,
    setOverrideToDelete,
    toggleTeacherSelection,
    clearSelection,
    openTemplateDialog,
    closeTemplateDialog,
    openOverrideDialog,
    closeOverrideDialog,
  };
}
