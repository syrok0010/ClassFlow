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
import type { SubjectFilterType, SubjectSortKey } from "../_lib/constants";
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
  const [sortBy, setSortBy] = useQueryState("sort", {
    defaultValue: "name",
    shallow: true,
  });
  const [groupedState, setGroupedState] = useQueryState("grouped", {
    defaultValue: "1",
    shallow: true,
  });

  const [isAddingRow, setIsAddingRow] = useState(false);
  const [deleteSubject, setDeleteSubject] = useState<SubjectWithUsage | null>(null);
  const [deleteGuards, setDeleteGuards] = useState<SubjectDeleteGuards | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const grouped = groupedState !== "0";
  const safeType =
    filterType === "ACADEMIC" || filterType === "ELECTIVE" || filterType === "REGIME"
      ? filterType
      : "all";
  const safeSort: SubjectSortKey = sortBy === "type" ? "type" : "name";

  const visibleSubjects = useMemo(
    () =>
      filterAndSortSubjects(subjects, {
        search: searchQuery,
        typeFilter: safeType as SubjectFilterType,
        sort: safeSort,
      }),
    [safeSort, safeType, searchQuery, subjects]
  );

  const hasActiveFilters =
    Boolean(searchQuery) || safeType !== "all" || safeSort !== "name" || !grouped;

  const handleDeleteRequest = async (subject: SubjectWithUsage) => {
    setDeleteSubject(subject);
    setDeleteOpen(true);
    const guards = await loadDeleteGuards(subject.id);
    if (guards) {
      setDeleteGuards(guards);
      return;
    }

    setDeleteGuards(subject.usage);
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
    void setSortBy(null);
    void setGroupedState(null);
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
        sortBy={safeSort}
        onSortByChange={(value) => {
          void setSortBy(value === "name" ? null : value);
        }}
        grouped={grouped}
        onGroupedChange={(value) => {
          void setGroupedState(value ? null : "0");
        }}
        isAddingRow={isAddingRow}
        onAddSubject={() => setIsAddingRow(true)}
      />

      <SubjectsTable
        allSubjectsCount={subjects.length}
        subjects={visibleSubjects}
        isAddingRow={isAddingRow}
        grouped={grouped}
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
        isDeleting={deleteLoading}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteSubject(null);
            setDeleteGuards(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
