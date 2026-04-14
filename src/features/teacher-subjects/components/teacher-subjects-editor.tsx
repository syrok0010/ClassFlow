"use client";

import { useMemo, useState } from "react";
import { useQueryState } from "nuqs";
import type { SubjectFilterType } from "@/lib/types";
import { useTeacherSubjectsCrud } from "../hooks/use-teacher-subjects-crud";
import { filterAndSortTeacherSubjects } from "../lib/teacher-subject-table-utils";
import type { TeacherSubjectsPageData, TeacherSubjectRow } from "../lib/types";
import { TeacherSubjectDeleteDialog } from "./teacher-subject-delete-dialog";
import { TeacherSubjectsSummary } from "./teacher-subjects-summary";
import { TeacherSubjectsTable } from "./teacher-subjects-table";
import { TeacherSubjectsToolbar } from "./teacher-subjects-toolbar";

interface TeacherSubjectsEditorProps {
  initialData: TeacherSubjectsPageData;
  addButtonLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  createFirstLabel?: string;
}

function toSubjectFilterType(value: string): SubjectFilterType {
  if (
    value === "ACADEMIC" ||
    value === "ELECTIVE_REQUIRED" ||
    value === "ELECTIVE_OPTIONAL" ||
    value === "REGIME"
  ) {
    return value;
  }

  return "ALL";
}

export function TeacherSubjectsEditor({
  initialData,
  addButtonLabel,
  emptyTitle,
  emptyDescription,
  createFirstLabel,
}: TeacherSubjectsEditorProps) {
  const { teacher, subjectOptions } = initialData;
  const {
    rows,
    summary,
    handleCreateTeacherSubject,
    handleUpdateTeacherSubject,
    handleDeleteTeacherSubject,
  } = useTeacherSubjectsCrud(initialData.teacherSubjects, teacher.teacherId);

  const [searchQuery, setSearchQuery] = useQueryState("search", {
    defaultValue: "",
    shallow: true,
  });
  const [filterType, setFilterType] = useQueryState("type", {
    defaultValue: "ALL",
    shallow: true,
  });

  const [isAddingRow, setIsAddingRow] = useState(false);
  const [deleteRow, setDeleteRow] = useState<TeacherSubjectRow | null>(null);

  const safeFilterType = toSubjectFilterType(filterType);

  const visibleRows = useMemo(
    () =>
      filterAndSortTeacherSubjects(rows, {
        search: searchQuery,
        typeFilter: safeFilterType,
      }),
    [rows, searchQuery, safeFilterType]
  );

  const hasActiveFilters = Boolean(searchQuery) || safeFilterType !== "ALL";

  const resetFilters = () => {
    void setSearchQuery(null);
    void setFilterType(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <TeacherSubjectsSummary summary={summary} />

      <TeacherSubjectsToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={(value) => {
          void setSearchQuery(value || null);
        }}
        filterType={safeFilterType}
        onFilterTypeChange={(value) => {
          void setFilterType(value === "ALL" ? null : value);
        }}
        isAddingRow={isAddingRow}
        onAddSubject={() => setIsAddingRow(true)}
        addButtonLabel={addButtonLabel}
      />

      <TeacherSubjectsTable
        rows={visibleRows}
        subjectOptions={subjectOptions}
        isAddingRow={isAddingRow}
        hasActiveFilters={hasActiveFilters}
        onCreateSubject={(payload) => handleCreateTeacherSubject(payload, subjectOptions)}
        onUpdateSubject={handleUpdateTeacherSubject}
        onDeleteRequest={setDeleteRow}
        onCancelAddRow={() => setIsAddingRow(false)}
        onCreateFirst={() => setIsAddingRow(true)}
        onResetFilters={resetFilters}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        createFirstLabel={createFirstLabel}
      />

      {deleteRow ? (
        <TeacherSubjectDeleteDialog
          row={deleteRow}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteRow(null);
            }
          }}
          onConfirm={handleDeleteTeacherSubject}
        />
      ) : null}
    </div>
  );
}
