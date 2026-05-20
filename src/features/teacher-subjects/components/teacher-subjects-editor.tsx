"use client";

import { useMemo, useState } from "react";
import { useQueryState } from "nuqs";
import { useDebouncedQueryState } from "@/hooks/use-debounced-query-state";
import type { SubjectFilterType } from "@/lib/types";
import { useTeacherSubjectsCrud } from "../hooks/use-teacher-subjects-crud";
import { filterAndSortTeacherSubjects } from "../lib/teacher-subject-table-utils";
import type { TeacherSubjectsPageData, TeacherSubjectRow } from "../lib/types";
import { TeacherSubjectDeleteDialog } from "./teacher-subject-delete-dialog";
import { TeacherSubjectsSummary } from "./teacher-subjects-summary";
import { TeacherSubjectsTable } from "./teacher-subjects-table";
import { TeacherSubjectsToolbar } from "./teacher-subjects-toolbar";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeacherSubjectsEditorProps {
  initialData: TeacherSubjectsPageData;
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
  const [searchInput, setSearchInput] = useDebouncedQueryState(searchQuery, setSearchQuery);
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
        searchQuery={searchInput}
        onSearchQueryChange={setSearchInput}
        filterType={safeFilterType}
        onFilterTypeChange={(value) => {
          void setFilterType(value === "ALL" ? null : value);
        }}
        onAddSubject={() => setIsAddingRow(true)}
        showAddButton={rows.length > 0 && !isAddingRow}
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
        onResetFilters={resetFilters}
        emptyStateConfig={{
          title: "У вас пока не добавлено ни одного предмета",
          description: "Добавьте предметы и диапазоны классов, чтобы завуч мог учитывать их при составлении расписания",
          icon: <BookOpen/>,
          action: <Button onClick={() => setIsAddingRow(true)}><Plus/>{"Добавить предмет"}</Button>
        }}
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
