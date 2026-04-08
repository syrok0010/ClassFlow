import { useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
import { Input } from "@/components/ui/input";
import { SubjectTypeBadge } from "@/components/ui/subject-type-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  UpdateTeacherSubjectInlineFormValues,
  UpdateTeacherSubjectInput,
} from "../_lib/schemas";
import {
  gradeTextValidationSchema,
  updateTeacherSubjectInlineFormSchema,
  updateTeacherSubjectInlineValidationSchema,
} from "../_lib/schemas";
import type { SubjectOption, TeacherSubjectRow } from "../_lib/types";
import { InlineCreateRow } from "./inline-create-row";

interface TeacherSubjectsTableProps {
  allRowsCount: number;
  rows: TeacherSubjectRow[];
  subjectOptions: SubjectOption[];
  isAddingRow: boolean;
  hasActiveFilters: boolean;
  onCreateSubject: (payload: {
    subjectId: string;
    minGrade: number;
    maxGrade: number;
  }) => Promise<boolean>;
  onUpdateSubject: (row: TeacherSubjectRow, payload: UpdateTeacherSubjectInput) => Promise<boolean>;
  onDeleteRequest: (row: TeacherSubjectRow) => void;
  onCancelAddRow: () => void;
  onCreateFirst: () => void;
  onResetFilters: () => void;
}

type EditingCell = {
  rowId: string;
  field: "minGrade" | "maxGrade";
};

function rowKey(row: TeacherSubjectRow) {
  return `${row.teacherId}:${row.subjectId}`;
}

interface TeacherSubjectDataRowProps {
  row: TeacherSubjectRow;
  subjectName: string;
  onUpdateSubject: (row: TeacherSubjectRow, payload: UpdateTeacherSubjectInput) => Promise<boolean>;
  onDeleteRequest: (row: TeacherSubjectRow) => void;
}

function TeacherSubjectDataRow({
  row,
  subjectName,
  onUpdateSubject,
  onDeleteRequest,
}: TeacherSubjectDataRowProps) {
  const [editingCell, setEditingCell] = useState<EditingCell["field"] | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      minGrade: row.minGrade === null ? "" : String(row.minGrade),
      maxGrade: row.maxGrade === null ? "" : String(row.maxGrade),
    } as UpdateTeacherSubjectInlineFormValues,
    validators: {
      onSubmit: updateTeacherSubjectInlineValidationSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = updateTeacherSubjectInlineFormSchema.parse(value);

      if (row.minGrade === parsed.minGrade && row.maxGrade === parsed.maxGrade) {
        setServerError(null);
        setEditingCell(null);
        return;
      }

      const success = await onUpdateSubject(row, parsed);

      if (success) {
        setServerError(null);
        setEditingCell(null);
        return;
      }

      setServerError("Не удалось сохранить изменения");
    },
  });

  const beginEdit = (field: EditingCell["field"]) => {
    setEditingCell(field);
    setServerError(null);
    form.reset({
      minGrade: row.minGrade === null ? "" : String(row.minGrade),
      maxGrade: row.maxGrade === null ? "" : String(row.maxGrade),
    });
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setServerError(null);
    form.reset({
      minGrade: row.minGrade === null ? "" : String(row.minGrade),
      maxGrade: row.maxGrade === null ? "" : String(row.maxGrade),
    });
  };

  const isEditing = editingCell !== null;

  return (
    <TableRow>
      <TableCell className="font-medium">{subjectName}</TableCell>
      <TableCell>
        <SubjectTypeBadge type={row.subjectType} />
      </TableCell>

      <TableCell>
        {isEditing ? (
          <form.Field name="minGrade" validators={{ onBlur: gradeTextValidationSchema }}>
            {(field) => (
              <div className="grid gap-1">
                <Input
                  autoFocus={editingCell === "minGrade"}
                  inputMode="numeric"
                  className={cn("h-7", field.state.meta.errors.length > 0 && "border-destructive")}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    if (serverError) {
                      setServerError(null);
                    }
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    if (!form.state.isSubmitting) {
                      void form.handleSubmit();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void form.handleSubmit();
                      return;
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelEdit();
                    }
                  }}
                  disabled={form.state.isSubmitting}
                />
                {field.state.meta.errors.length > 0 ? (
                  <p className="text-xs text-destructive">
                    {field.state.meta.errors
                      .flatMap((error) => (error ? [error.message] : []))
                      .join(", ")}
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>
        ) : (
          <button
            type="button"
            className="w-full cursor-pointer rounded px-1 py-1 text-left hover:bg-muted"
            onClick={() => beginEdit("minGrade")}
          >
            {row.minGrade ?? "-"}
          </button>
        )}
      </TableCell>

      <TableCell>
        {isEditing ? (
          <form.Field name="maxGrade" validators={{ onBlur: gradeTextValidationSchema }}>
            {(field) => (
              <div className="grid gap-1">
                <Input
                  autoFocus={editingCell === "maxGrade"}
                  inputMode="numeric"
                  className={cn("h-7", field.state.meta.errors.length > 0 && "border-destructive")}
                  value={field.state.value}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    if (serverError) {
                      setServerError(null);
                    }
                  }}
                  onBlur={() => {
                    field.handleBlur();
                    if (!form.state.isSubmitting) {
                      void form.handleSubmit();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void form.handleSubmit();
                      return;
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelEdit();
                    }
                  }}
                  disabled={form.state.isSubmitting}
                />
                {field.state.meta.errors.length > 0 ? (
                  <p className="text-xs text-destructive">
                    {field.state.meta.errors
                      .flatMap((error) => (error ? [error.message] : []))
                      .join(", ")}
                  </p>
                ) : null}
              </div>
            )}
          </form.Field>
        ) : (
          <button
            type="button"
            className="w-full cursor-pointer rounded px-1 py-1 text-left hover:bg-muted"
            onClick={() => beginEdit("maxGrade")}
          >
            {row.maxGrade ?? "-"}
          </button>
        )}
      </TableCell>

      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onDeleteRequest(row)}
            aria-label="Удалить компетенцию"
          >
            <Trash2 className="size-4" />
          </Button>
          {serverError ? <span className="text-xs text-destructive">{serverError}</span> : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function TeacherSubjectsTable({
  allRowsCount,
  rows,
  subjectOptions,
  isAddingRow,
  hasActiveFilters,
  onCreateSubject,
  onUpdateSubject,
  onDeleteRequest,
  onCancelAddRow,
  onCreateFirst,
  onResetFilters,
}: TeacherSubjectsTableProps) {
  const hasRows = rows.length > 0;

  const subjectNamesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of subjectOptions) {
      map.set(option.id, option.name);
    }
    return map;
  }, [subjectOptions]);

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead>Предмет</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead className="w-35">От класса</TableHead>
            <TableHead className="w-35">До класса</TableHead>
            <TableHead className="w-45" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isAddingRow ? (
            <InlineCreateRow
              subjectOptions={subjectOptions}
              onSave={onCreateSubject}
              onCancel={onCancelAddRow}
            />
          ) : null}

          {!hasRows && !isAddingRow ? (
            <TableRow>
              <TableCell colSpan={5}>
                <FilterableEmptyState
                  hasFilters={hasActiveFilters && allRowsCount > 0}
                  onResetFilters={onResetFilters}
                  onCreateFirst={onCreateFirst}
                  emptyTitle="У преподавателя пока не назначено ни одного предмета"
                  emptyDescription="Добавьте предметы и диапазоны классов, чтобы система могла учитывать этого преподавателя в учебном плане и расписании."
                  createFirstLabel="+ Добавить первый предмет"
                />
              </TableCell>
            </TableRow>
          ) : null}

          {rows.map((row) => {
            const id = rowKey(row);
            const subjectName = subjectNamesById.get(row.subjectId) ?? row.subjectName;

            return (
              <TeacherSubjectDataRow
                key={id}
                row={row}
                subjectName={subjectName}
                onUpdateSubject={onUpdateSubject}
                onDeleteRequest={onDeleteRequest}
              />
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
