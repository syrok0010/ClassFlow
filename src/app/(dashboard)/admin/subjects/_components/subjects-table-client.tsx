"use client";

import { useMemo, useState } from "react";
import { useQueryState } from "nuqs";
import { SubjectsToolbar } from "./subjects-toolbar";
import { SubjectsTable } from "./subjects-table";
import { SubjectDeleteDialog } from "./subject-delete-dialog";
import type { SubjectDeleteGuards, SubjectWithUsage } from "../_lib/types";
import {
  filterAndSortSubjects,
} from "../_lib/subject-table-utils";
import type { SubjectFilterType } from "../_lib/constants";
import { useSubjectsCrud } from "../_hooks/use-subjects-crud";

interface SubjectsTableClientProps {
  initialSubjects: SubjectWithUsage[];
}

export function SubjectsTableClient({ initialSubjects }: SubjectsTableClientProps) {
  const {
    subjects,
    handleCreateSubject,
    handleRenameSubject,
    handleDeleteSubject,
    loadDeleteGuards,
  } = useSubjectsCrud(initialSubjects);

  const [searchQuery, setSearchQuery] = useQueryState("search", {
    defaultValue: "",
    shallow: true,
  });
  const [filterType, setFilterType] = useQueryState("type", {
    defaultValue: "all",
    shallow: true,
  });

  const [isAddingRow, setIsAddingRow] = useState(false);
  const [deleteSubject, setDeleteSubject] = useState<SubjectWithUsage | null>(null);
  const [deleteGuards, setDeleteGuards] = useState<SubjectDeleteGuards | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteGuardsLoading, setDeleteGuardsLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const safeType =
    filterType === "ACADEMIC" ||
    filterType === "ELECTIVE_REQUIRED" ||
    filterType === "ELECTIVE_OPTIONAL" ||
    filterType === "REGIME"
      ? filterType
      : "all";

  const visibleSubjects = useMemo(
    () =>
      filterAndSortSubjects(subjects, {
        search: searchQuery,
        typeFilter: safeType as SubjectFilterType,
      }),
    [safeType, searchQuery, subjects]
  );

  const hasActiveFilters = Boolean(searchQuery) || safeType !== "all";

  const handleDeleteRequest = async (subject: SubjectWithUsage) => {
    setDeleteSubject(subject);
    setDeleteGuards(null);
    setDeleteGuardsLoading(true);
    setDeleteOpen(true);

    try {
      const guards = await loadDeleteGuards(subject.id);
      if (guards) {
        setDeleteGuards(guards);
        return;
      }

      setDeleteGuards(subject.usage);
    } finally {
      setDeleteGuardsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSubject) {
      return;
    }

    setDeleteLoading(true);
    try {
      const success = await handleDeleteSubject(deleteSubject);
      if (success) {
        setDeleteOpen(false);
        setDeleteSubject(null);
        setDeleteGuards(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetFilters = () => {
    void setSearchQuery(null);
    void setFilterType(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Предметы</h1>
          <p className="mt-1 text-muted-foreground">
            Управление списком предметов и режимных моментов.
          </p>
        </div>
      </div>

      <SubjectsToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={(value) => {
          void setSearchQuery(value || null);
        }}
        filterType={safeType as SubjectFilterType}
        onFilterTypeChange={(value) => {
          void setFilterType(value === "all" ? null : value);
        }}
        isAddingRow={isAddingRow}
        onAddSubject={() => setIsAddingRow(true)}
      />

      <SubjectsTable
        allSubjectsCount={subjects.length}
        subjects={visibleSubjects}
        isAddingRow={isAddingRow}
        hasActiveFilters={hasActiveFilters}
        onCreateSubject={handleCreateSubject}
        onRenameSubject={handleRenameSubject}
        onDeleteRequest={handleDeleteRequest}
        onCancelAddRow={() => setIsAddingRow(false)}
        onCreateFirst={() => setIsAddingRow(true)}
        onResetFilters={resetFilters}
      />

      <SubjectDeleteDialog
        open={deleteOpen}
        subject={deleteSubject}
        guards={deleteGuards}
        isLoadingGuards={deleteGuardsLoading}
        isDeleting={deleteLoading}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteSubject(null);
            setDeleteGuards(null);
            setDeleteGuardsLoading(false);
          }
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
