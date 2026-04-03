"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueryState } from "nuqs";
import { AlertTriangle } from "lucide-react";
import { useTeacherSubjectsCrud } from "../_hooks/use-teacher-subjects-crud";
import { filterAndSortTeacherSubjects } from "../_lib/teacher-subject-table-utils";
import type { TeachingPageData, TeacherSubjectFilterType, TeacherSubjectRow } from "../_lib/types";
import { TeacherSubjectDeleteDialog } from "./teacher-subject-delete-dialog";
import { TeacherSubjectsSummary } from "./teacher-subjects-summary";
import { TeacherSubjectsTable } from "./teacher-subjects-table";
import { TeacherSubjectsToolbar } from "./teacher-subjects-toolbar";

interface TeacherSubjectsPageClientProps {
  initialData: TeachingPageData;
}

function statusLabel(status: TeachingPageData["teacher"]["status"]) {
  if (status === "ACTIVE") {
    return "Активен";
  }

  if (status === "PENDING_INVITE") {
    return "Ожидает инвайт";
  }

  return "Заблокирован";
}

export function TeacherSubjectsPageClient({ initialData }: TeacherSubjectsPageClientProps) {
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
  const [deleteLoading, setDeleteLoading] = useState(false);

  const safeFilterType: TeacherSubjectFilterType =
    filterType === "ACADEMIC" || filterType === "ELECTIVE" || filterType === "REGIME"
      ? filterType
      : "ALL";

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

  const onDeleteConfirm = async () => {
    if (!deleteRow) {
      return;
    }

    setDeleteLoading(true);
    try {
      const success = await handleDeleteTeacherSubject(deleteRow);
      if (success) {
        setDeleteRow(null);
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link className="hover:text-foreground" href="/admin/users">
            Пользователи
          </Link>{" "}
          / <span>{teacher.fullName}</span> / <span>Компетенции</span>
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Компетенции преподавателя</h1>
        <p className="text-sm text-muted-foreground">
          {teacher.fullName} · {teacher.email ?? "email не указан"} · {teacher.roleLabels.join(", ") || "без ролей"} · {statusLabel(teacher.status)}
        </p>
      </div>

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
      />

      <TeacherSubjectsTable
        allRowsCount={rows.length}
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
      />

      {deleteRow ? (
        <TeacherSubjectDeleteDialog
          row={deleteRow}
          isDeleting={deleteLoading}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteRow(null);
            }
          }}
          onConfirm={onDeleteConfirm}
        />
      ) : null}
    </div>
  );
}

export function TeacherSubjectsPageError({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4">
      <div className="w-full rounded-2xl border bg-card p-8 text-card-foreground shadow-sm">
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Не удалось открыть страницу компетенций</h1>
        <p className="mt-2 text-sm text-muted-foreground">Проверьте, что выбран пользователь с ролью преподавателя.</p>

        <div className="mt-5 rounded-lg border bg-muted/40 p-3">
          <p className="text-sm text-foreground">• {message}</p>
        </div>

        <div className="mt-6 flex gap-2">
          <Link
            href="/admin/users"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Вернуться к пользователям
          </Link>
        </div>
      </div>
    </div>
  );
}
