import { useMemo, useState, type KeyboardEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SubjectOption, TeacherSubjectRow } from "../_lib/types";
import { TeacherSubjectTypeBadge } from "./teacher-subject-type-badge";
import { InlineCreateTeacherSubjectRow } from "./inline-create-teacher-subject-row";
import { TeacherSubjectsEmptyState } from "./teacher-subjects-empty-state";

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
  onUpdateSubject: (row: TeacherSubjectRow, minGrade: number, maxGrade: number) => Promise<boolean>;
  onDeleteRequest: (row: TeacherSubjectRow) => void;
  onCancelAddRow: () => void;
  onCreateFirst: () => void;
  onResetFilters: () => void;
}

type EditingCell = {
  rowId: string;
  field: "minGrade" | "maxGrade";
};

function toGrade(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function validateRange(minGrade: number | null, maxGrade: number | null): string | null {
  if (minGrade === null || maxGrade === null) {
    return "Укажите диапазон классов";
  }

  if (minGrade < 0 || maxGrade < 0 || minGrade > 11 || maxGrade > 11) {
    return "Класс должен быть в диапазоне от 0 до 11";
  }

  if (minGrade > maxGrade) {
    return "Класс от не может быть больше класса до";
  }

  return null;
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
    const minGrade = toGrade(draft.minGrade);
    const maxGrade = toGrade(draft.maxGrade);

    const error = validateRange(minGrade, maxGrade);
    if (error) {
      setRowError((prev) => ({ ...prev, [id]: error }));
      return;
    }

    if (row.minGrade === minGrade && row.maxGrade === maxGrade) {
      setEditingCell(null);
      setRowError((prev) => ({ ...prev, [id]: null }));
      return;
    }

    setSavingRowId(id);
    const success = await onUpdateSubject(row, minGrade as number, maxGrade as number);
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
            <TableHead className="w-[140px]">От класса</TableHead>
            <TableHead className="w-[140px]">До класса</TableHead>
            <TableHead className="w-[72px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isAddingRow ? (
            <InlineCreateTeacherSubjectRow
              subjectOptions={subjectOptions}
              onSave={onCreateSubject}
              onCancel={onCancelAddRow}
            />
          ) : null}

          {!hasRows && !isAddingRow ? (
            <TableRow>
              <TableCell colSpan={5}>
                <TeacherSubjectsEmptyState
                  hasFilters={hasActiveFilters && allRowsCount > 0}
                  onResetFilters={onResetFilters}
                  onCreateFirst={onCreateFirst}
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
                  <TeacherSubjectTypeBadge type={row.subjectType} />
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
