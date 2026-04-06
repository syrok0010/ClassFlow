import { useMemo, useState, type KeyboardEvent } from "react";
import { z } from "zod/v4";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
import { Input } from "@/components/ui/input";
import { SubjectTypeBadge } from "@/components/ui/subject-type-badge";
import type { UpdateTeacherSubjectInput } from "../_lib/schemas";
import { updateTeacherSubjectSchema } from "../_lib/schemas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const gradeTextSchema = z.string().trim().min(1, "Укажите диапазон классов").pipe(z.coerce.number());

function parseDraftRange(draft: { minGrade: string; maxGrade: string }) {
  const minResult = gradeTextSchema.safeParse(draft.minGrade);
  const maxResult = gradeTextSchema.safeParse(draft.maxGrade);

  if (!minResult.success || !maxResult.success) {
    return { error: "Укажите диапазон классов" } as {
      error: string;
    };
  }

  const validated = updateTeacherSubjectSchema.safeParse({
    minGrade: minResult.data,
    maxGrade: maxResult.data,
  });

  if (!validated.success) {
    return {
      error: validated.error.issues[0]?.message ?? "Некорректный диапазон классов",
    } as {
      error: string;
    };
  }

  return { value: validated.data } as {
    value: { minGrade: number; maxGrade: number };
  };
}

function rowKey(row: TeacherSubjectRow) {
  return `${row.teacherId}:${row.subjectId}`;
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
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { minGrade: string; maxGrade: string }>>({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string | null>>({});

  const hasRows = rows.length > 0;

  const subjectNamesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of subjectOptions) {
      map.set(option.id, option.name);
    }
    return map;
  }, [subjectOptions]);

  const getDraft = (row: TeacherSubjectRow) => {
    const id = rowKey(row);
    const existing = drafts[id];
    if (existing) {
      return existing;
    }

    return {
      minGrade: row.minGrade === null ? "" : String(row.minGrade),
      maxGrade: row.maxGrade === null ? "" : String(row.maxGrade),
    };
  };

  const beginEdit = (row: TeacherSubjectRow, field: EditingCell["field"]) => {
    const id = rowKey(row);
    setDrafts((prev) => ({
      ...prev,
      [id]: getDraft(row),
    }));
    setEditingCell({ rowId: id, field });
    setRowError((prev) => ({ ...prev, [id]: null }));
  };

  const commitRow = async (row: TeacherSubjectRow) => {
    const id = rowKey(row);
    const draft = getDraft(row);

    const parsedRange = parseDraftRange(draft);
    if ("error" in parsedRange) {
      setRowError((prev) => ({ ...prev, [id]: parsedRange.error }));
      return;
    }

    const { minGrade, maxGrade } = parsedRange.value;

    if (row.minGrade === minGrade && row.maxGrade === maxGrade) {
      setEditingCell(null);
      setRowError((prev) => ({ ...prev, [id]: null }));
      return;
    }

    setSavingRowId(id);
    const success = await onUpdateSubject(row, { minGrade, maxGrade });
    setSavingRowId(null);

    if (success) {
      setEditingCell(null);
      setRowError((prev) => ({ ...prev, [id]: null }));
      return;
    }

    setRowError((prev) => ({ ...prev, [id]: "Не удалось сохранить изменения" }));
  };

  const cancelEdit = (row: TeacherSubjectRow) => {
    const id = rowKey(row);
    setEditingCell(null);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRowError((prev) => ({ ...prev, [id]: null }));
  };

  const onInputKeyDown = async (
    event: KeyboardEvent<HTMLInputElement>,
    row: TeacherSubjectRow
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await commitRow(row);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit(row);
    }
  };

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
            const draft = getDraft(row);
            const editingMin = editingCell?.rowId === id && editingCell.field === "minGrade";
            const editingMax = editingCell?.rowId === id && editingCell.field === "maxGrade";
            const isSaving = savingRowId === id;
            const gradeError = rowError[id];

            return (
              <TableRow key={id}>
                <TableCell className="font-medium">{subjectNamesById.get(row.subjectId) ?? row.subjectName}</TableCell>
                <TableCell>
                  <SubjectTypeBadge type={row.subjectType} />
                </TableCell>

                <TableCell>
                  {editingMin || editingMax ? (
                    <Input
                      autoFocus={editingMin}
                      inputMode="numeric"
                      className={gradeError ? "h-7 border-destructive" : "h-7"}
                      value={draft.minGrade}
                      onChange={(event) => {
                        setDrafts((prev) => ({
                          ...prev,
                          [id]: {
                            ...draft,
                            minGrade: event.target.value,
                          },
                        }));
                        if (gradeError) {
                          setRowError((prev) => ({ ...prev, [id]: null }));
                        }
                      }}
                      onKeyDown={(event) => {
                        void onInputKeyDown(event, row);
                      }}
                      onBlur={() => {
                        if (!isSaving) {
                          void commitRow(row);
                        }
                      }}
                      disabled={isSaving}
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full cursor-pointer rounded px-1 py-1 text-left hover:bg-muted"
                      onClick={() => beginEdit(row, "minGrade")}
                    >
                      {row.minGrade ?? "-"}
                    </button>
                  )}
                </TableCell>

                <TableCell>
                  {editingMin || editingMax ? (
                    <Input
                      autoFocus={editingMax}
                      inputMode="numeric"
                      className={gradeError ? "h-7 border-destructive" : "h-7"}
                      value={draft.maxGrade}
                      onChange={(event) => {
                        setDrafts((prev) => ({
                          ...prev,
                          [id]: {
                            ...draft,
                            maxGrade: event.target.value,
                          },
                        }));
                        if (gradeError) {
                          setRowError((prev) => ({ ...prev, [id]: null }));
                        }
                      }}
                      onKeyDown={(event) => {
                        void onInputKeyDown(event, row);
                      }}
                      onBlur={() => {
                        if (!isSaving) {
                          void commitRow(row);
                        }
                      }}
                      disabled={isSaving}
                    />
                  ) : (
                    <button
                      type="button"
                      className="w-full cursor-pointer rounded px-1 py-1 text-left hover:bg-muted"
                      onClick={() => beginEdit(row, "maxGrade")}
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
                    {gradeError ? <span className="text-xs text-destructive">{gradeError}</span> : null}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
