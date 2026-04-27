"use client";

import { useMemo, useState } from "react";
import { useQueryState } from "nuqs";
import { useDebouncedQueryState } from "@/hooks/use-debounced-query-state";
import { SubjectDeleteDialog } from "./subject-delete-dialog";
import { SubjectsTable } from "./subjects-table";
import { SubjectsToolbar } from "./subjects-toolbar";
import type { SubjectFilterType } from "@/lib/types";
import { useSubjectsCrud } from "../_hooks/use-subjects-crud";
import { filterAndSortSubjects } from "../_lib/subject-table-utils";
import type { SubjectWithUsage } from "../_lib/types";

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
  const [searchInput, setSearchInput] = useDebouncedQueryState(searchQuery, setSearchQuery);
  const [filterType, setFilterType] = useQueryState("type", {
    defaultValue: "ALL",
    shallow: true,
  });

  const [isAddingRow, setIsAddingRow] = useState(false);
  const [deleteSubject, setDeleteSubject] = useState<SubjectWithUsage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const safeType =
    filterType === "ACADEMIC" ||
    filterType === "ELECTIVE_REQUIRED" ||
    filterType === "ELECTIVE_OPTIONAL" ||
    filterType === "REGIME"
      ? filterType
      : "ALL";

  const visibleSubjects = useMemo(
    () =>
      filterAndSortSubjects(subjects, {
        search: searchQuery,
        typeFilter: safeType as SubjectFilterType,
      }),
    [safeType, searchQuery, subjects]
  );

  const hasActiveFilters = Boolean(searchQuery) || safeType !== "ALL";

  const handleDeleteRequest = async (subject: SubjectWithUsage) => {
    setDeleteSubject(subject);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSubject) {
      return;
    }

    setDeleteLoading(true);
    try {
      const success = await handleDeleteSubject(deleteSubject);
      if (success) {
        setDeleteSubject(null);
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
        searchQuery={searchInput}
        onSearchQueryChange={setSearchInput}
        filterType={safeType as SubjectFilterType}
        onFilterTypeChange={(value) => {
          void setFilterType(value === "ALL" ? null : value);
        }}
        isAddingRow={isAddingRow}
        onAddSubject={() => setIsAddingRow(true)}
      />

      <SubjectsTable
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

      {deleteSubject && (
        <SubjectDeleteDialog
          key={deleteSubject.id}
          subject={deleteSubject}
          isDeleting={deleteLoading}
          loadDeleteGuards={loadDeleteGuards}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteSubject(null);
            }
          }}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
