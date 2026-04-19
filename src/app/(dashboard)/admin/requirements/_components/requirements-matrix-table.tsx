"use client";

import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Header,
} from "@tanstack/react-table";
import {
  Clock3,
  Coffee,
  Lock,
  Minus,
  Plus,
} from "lucide-react";
import type { GroupType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  getCollapsedGroupColumnId,
  getSubjectColumnId,
  QUICK_INPUT_DEFAULT_BREAK,
  QUICK_INPUT_DEFAULT_DURATION,
  SUBJECT_COLUMN_GROUPS,
} from "../_lib/constants";
import {
  getWeeklyTotalForClassRow,
  groupSubjectsByColumnType,
  makeRequirementMap,
} from "../_lib/utils";
import type {
  FlatRequirementRow,
  RequirementEntry,
  RequirementSubject,
  SubjectColumnGroupKey,
} from "../_lib/types";
import { RequirementCellEditor } from "./requirement-cell-editor";

type ActiveCell = {
  rowId: string;
  subjectId: string;
};

type EditingCell = {
  rowId: string;
  subjectId: string;
  initialLessons?: number;
  instanceId: string;
};

type RequirementsMatrixTableProps = {
  rows: FlatRequirementRow[];
  subjects: RequirementSubject[];
  requirements: RequirementEntry[];
  quickInputMode: boolean;
  collapsedColumnGroups: Set<SubjectColumnGroupKey>;
  onToggleColumnGroup: (key: SubjectColumnGroupKey) => void;
  onSaveCell: (payload: {
    rowId: string;
    subjectId: string;
    lessonsPerWeek: number;
    durationInMinutes: number;
    breakDuration: number;
  }) => Promise<void>;
};

type CellPayload =
  | { kind: "subject"; subject: RequirementSubject }
  | { kind: "collapsed"; groupKey: SubjectColumnGroupKey };

const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  CLASS: "Класс",
  ELECTIVE_GROUP: "Кружок",
  KINDERGARTEN_GROUP: "Группа",
  SUBJECT_SUBGROUP: "Подгруппа",
};

const SUBJECT_TYPE_CELL_TINT: Record<RequirementSubject["type"], string> = {
  ACADEMIC: "bg-blue-50",
  ELECTIVE_REQUIRED: "bg-orange-50",
  ELECTIVE_OPTIONAL: "bg-amber-50",
  REGIME: "bg-emerald-50",
};

function isCollapsedHeader(header: Header<FlatRequirementRow, unknown>): boolean {
  return header.column.id.startsWith("collapsed::");
}

function parseCollapsedGroupKey(id: string): SubjectColumnGroupKey | null {
  if (!id.startsWith("collapsed::")) {
    return null;
  }

  const key = id.replace("collapsed::", "");

  if (
    key === "REGIME" ||
    key === "ACADEMIC" ||
    key === "ELECTIVE_REQUIRED" ||
    key === "ELECTIVE_OPTIONAL"
  ) {
    return key;
  }

  return null;
}

function parseGroupHeaderKey(id: string): SubjectColumnGroupKey | null {
  const key = id.startsWith("group::") ? id.replace("group::", "") : id;

  if (
    key === "REGIME" ||
    key === "ACADEMIC" ||
    key === "ELECTIVE_REQUIRED" ||
    key === "ELECTIVE_OPTIONAL"
  ) {
    return key;
  }

  return null;
}

export function RequirementsMatrixTable({
  rows,
  subjects,
  requirements,
  quickInputMode,
  collapsedColumnGroups,
  onToggleColumnGroup,
  onSaveCell,
}: RequirementsMatrixTableProps) {
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const requirementsMap = useMemo(() => makeRequirementMap(requirements), [requirements]);
  const subjectsByGroup = useMemo(() => groupSubjectsByColumnType(subjects), [subjects]);

  const rightTotalByClass = useMemo(() => {
    const result = new Map<string, number>();

    for (const row of rows) {
      if (row.type !== "CLASS") {
        continue;
      }

      result.set(row.id, getWeeklyTotalForClassRow(row.id, subjects, requirementsMap));
    }

    return result;
  }, [requirementsMap, rows, subjects]);

  const matrixColumns = useMemo<ColumnDef<FlatRequirementRow>[]>(() => {
    const columns: ColumnDef<FlatRequirementRow>[] = [];

    for (const group of SUBJECT_COLUMN_GROUPS) {
      const groupSubjects = subjectsByGroup.get(group.key) ?? [];

      if (groupSubjects.length === 0) {
        continue;
      }

      columns.push({
        id: getCollapsedGroupColumnId(group.key),
        header: () => null,
        size: 48,
        minSize: 48,
        maxSize: 48,
        cell: () => null,
      });

      columns.push({
        id: group.key,
        header: () => group.label,
        columns: groupSubjects.map((subject) => ({
          id: getSubjectColumnId(subject.id),
          accessorFn: () => null,
          size: 136,
          minSize: 136,
          header: () => subject.name,
          cell: () => null,
        })),
      });
    }

    return columns;
  }, [subjectsByGroup]);

  const columnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};

    for (const group of SUBJECT_COLUMN_GROUPS) {
      const groupSubjects = subjectsByGroup.get(group.key) ?? [];
      if (groupSubjects.length === 0) {
        continue;
      }

      const collapsed = collapsedColumnGroups.has(group.key);
      visibility[getCollapsedGroupColumnId(group.key)] = collapsed;
      visibility[group.key] = !collapsed;

      for (const subject of groupSubjects) {
        visibility[getSubjectColumnId(subject.id)] = !collapsed;
      }
    }

    return visibility;
  }, [collapsedColumnGroups, subjectsByGroup]);

  const subjectsByColumnId = useMemo(() => {
    const map = new Map<string, RequirementSubject>();
    for (const subject of subjects) {
      map.set(getSubjectColumnId(subject.id), subject);
    }
    return map;
  }, [subjects]);

  const table = useReactTable({
    data: rows,
    columns: matrixColumns,
    state: {
      columnVisibility,
    },
    getCoreRowModel: getCoreRowModel(),
  });

  const headerGroups = table.getHeaderGroups();
  const visibleLeafColumns = table.getVisibleLeafColumns();
  const visibleSubjects = useMemo(
    () =>
      visibleLeafColumns
        .filter((column) => !column.id.startsWith("collapsed::"))
        .map((column) => subjectsByColumnId.get(column.id))
        .filter((subject): subject is RequirementSubject => Boolean(subject)),
    [visibleLeafColumns, subjectsByColumnId]
  );

  useEffect(() => {
    if (rows.length === 0 || visibleSubjects.length === 0) {
      setActiveCell(null);
      return;
    }

    if (!activeCell) {
      setActiveCell({ rowId: rows[0].id, subjectId: visibleSubjects[0].id });
      return;
    }

    const rowExists = rows.some((row) => row.id === activeCell.rowId);
    const subjectExists = visibleSubjects.some(
      (subject) => subject.id === activeCell.subjectId
    );

    if (!rowExists || !subjectExists) {
      setActiveCell({ rowId: rows[0].id, subjectId: visibleSubjects[0].id });
    }
  }, [activeCell, rows, visibleSubjects]);

  useEffect(() => {
    if (!activeCell) {
      return;
    }

    const key = `${activeCell.rowId}:${activeCell.subjectId}`;
    const target = document.querySelector<HTMLButtonElement>(
      `[data-cell-focus-id="${key}"]`
    );

    target?.focus();
  }, [activeCell, editingCell]);

  const navigateActiveCell = (direction: "up" | "down" | "left" | "right") => {
    if (!activeCell || rows.length === 0 || visibleSubjects.length === 0) {
      return;
    }

    const rowIndex = rows.findIndex((row) => row.id === activeCell.rowId);
    const subjectIndex = visibleSubjects.findIndex(
      (subject) => subject.id === activeCell.subjectId
    );

    if (rowIndex < 0 || subjectIndex < 0) {
      return;
    }

    let nextRowIndex = rowIndex;
    let nextSubjectIndex = subjectIndex;

    if (direction === "up") {
      nextRowIndex = Math.max(0, rowIndex - 1);
    } else if (direction === "down") {
      nextRowIndex = Math.min(rows.length - 1, rowIndex + 1);
    } else if (direction === "left") {
      nextSubjectIndex = Math.max(0, subjectIndex - 1);
    } else if (direction === "right") {
      nextSubjectIndex = Math.min(visibleSubjects.length - 1, subjectIndex + 1);
    }

    setActiveCell({
      rowId: rows[nextRowIndex]?.id ?? activeCell.rowId,
      subjectId: visibleSubjects[nextSubjectIndex]?.id ?? activeCell.subjectId,
    });

    if (editingCell) {
      setEditingCell(null);
    }
  };

  const navigateAfterSave = (advance: "down" | "right" | "left" | "stay") => {
    if (!activeCell || rows.length === 0 || visibleSubjects.length === 0) {
      return;
    }

    if (advance === "stay") {
      setActiveCell({ rowId: activeCell.rowId, subjectId: activeCell.subjectId });
      return;
    }

    const rowIndex = rows.findIndex((row) => row.id === activeCell.rowId);
    const subjectIndex = visibleSubjects.findIndex(
      (subject) => subject.id === activeCell.subjectId
    );

    if (rowIndex < 0 || subjectIndex < 0) {
      return;
    }

    let nextRowIndex = rowIndex;
    let nextSubjectIndex = subjectIndex;

    if (advance === "down") {
      nextRowIndex = Math.min(rows.length - 1, rowIndex + 1);
    } else if (advance === "left") {
      nextSubjectIndex = Math.max(0, subjectIndex - 1);
    } else {
      nextSubjectIndex = Math.min(visibleSubjects.length - 1, subjectIndex + 1);
    }

    setActiveCell({
      rowId: rows[nextRowIndex]?.id ?? activeCell.rowId,
      subjectId: visibleSubjects[nextSubjectIndex]?.id ?? activeCell.subjectId,
    });
  };

  const startEditing = (cell: Omit<EditingCell, "instanceId"> & { instanceId?: string }) => {
    setActiveCell({ rowId: cell.rowId, subjectId: cell.subjectId });
    setEditingCell({
      rowId: cell.rowId,
      subjectId: cell.subjectId,
      initialLessons: cell.initialLessons,
      instanceId: cell.instanceId ?? crypto.randomUUID(),
    });
  };

  const renderGridCell = (row: FlatRequirementRow, payload: CellPayload) => {
    if (payload.kind === "collapsed") {
      return (
        <TableCell
          key={`${row.id}:${payload.groupKey}`}
          className="h-16 min-w-12 border-r border-b bg-muted/20 px-1 py-1"
        >
          <div className="h-full rounded-sm bg-muted/40" />
        </TableCell>
      );
    }

    const subject = payload.subject;
    const key = `${row.id}:${subject.id}`;
    const entry = requirementsMap.get(key) ?? null;
    const isActive = activeCell?.rowId === row.id && activeCell.subjectId === subject.id;
    const isEditing = editingCell?.rowId === row.id && editingCell.subjectId === subject.id;
    const isReadOnlySubgroup = row.type === "SUBJECT_SUBGROUP";

    return (
      <TableCell
        key={key}
        className={cn(
          "relative h-16 min-w-32 border-r border-b px-2 py-1",
          SUBJECT_TYPE_CELL_TINT[subject.type],
          !entry && "bg-muted/25",
          isActive && "ring-2 ring-primary/60 ring-inset"
        )}
      >
        <button
          type="button"
          className={cn(
            "group flex h-full w-full items-center justify-center text-center outline-none",
            isReadOnlySubgroup
              ? "cursor-not-allowed opacity-80"
              : "hover:bg-background/70 focus-visible:ring-ring"
          )}
          title={
            isReadOnlySubgroup
              ? "Нагрузка подгруппы меняется через родительский класс"
              : "Нажмите Enter или цифру для редактирования"
          }
          onClick={() => setActiveCell({ rowId: row.id, subjectId: subject.id })}
          onDoubleClick={() => {
            setActiveCell({ rowId: row.id, subjectId: subject.id });

            if (isReadOnlySubgroup) {
              return;
            }

            startEditing({
              rowId: row.id,
              subjectId: subject.id,
            });
          }}
          onKeyDown={(event) => {
            if (!isActive) {
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              navigateActiveCell("up");
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              navigateActiveCell("down");
              return;
            }

            if (event.key === "ArrowLeft") {
              event.preventDefault();
              navigateActiveCell("left");
              return;
            }

            if (event.key === "ArrowRight") {
              event.preventDefault();
              navigateActiveCell("right");
              return;
            }

            if (isReadOnlySubgroup) {
              return;
            }

            if (event.key === "Enter") {
              event.preventDefault();
              startEditing({
                rowId: row.id,
                subjectId: subject.id,
              });
              return;
            }

            if (/^[0-9]$/.test(event.key)) {
              event.preventDefault();

              if (quickInputMode) {
                void onSaveCell({
                  rowId: row.id,
                  subjectId: subject.id,
                  lessonsPerWeek: Number(event.key),
                  durationInMinutes:
                    entry?.durationInMinutes ?? QUICK_INPUT_DEFAULT_DURATION,
                  breakDuration: entry?.breakDuration ?? QUICK_INPUT_DEFAULT_BREAK,
                });
                return;
              }

              startEditing({
                rowId: row.id,
                subjectId: subject.id,
                initialLessons: Number(event.key),
              });
            }
          }}
          tabIndex={isActive ? 0 : -1}
          data-cell-focus-id={key}
        >
          {entry ? (
            <div className="flex flex-col items-center">
              <span className="text-xl font-semibold leading-none">{entry.lessonsPerWeek}</span>
              <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-0.5" title="Длительность урока">
                  <Clock3 className="size-3" />
                  {entry.durationInMinutes}м
                </span>
                <span className="inline-flex items-center gap-0.5" title="Длительность перемены">
                  <Coffee className="size-3" />
                  {entry.breakDuration}м
                </span>
              </span>
            </div>
          ) : (
            <span className="opacity-0 text-muted-foreground transition-opacity group-hover:opacity-60">
              <Plus className="size-4" />
            </span>
          )}

          {isReadOnlySubgroup ? (
            <span className="absolute right-1.5 top-1.5 text-muted-foreground">
              <Lock className="size-3.5" />
            </span>
          ) : null}
        </button>

        {isEditing && !isReadOnlySubgroup ? (
          <RequirementCellEditor
            key={editingCell.instanceId}
            quickInputMode={quickInputMode}
                            initial={entry}
                            initialLessons={editingCell?.initialLessons}
                            onCancel={() => setEditingCell(null)}
                            onSave={async ({
                              lessonsPerWeek,
                              durationInMinutes,
              breakDuration,
              advance,
            }) => {
                              await onSaveCell({
                                rowId: row.id,
                                subjectId: subject.id,
                                lessonsPerWeek,
                                durationInMinutes,
                                breakDuration,
                              });
                              setEditingCell(null);
                              navigateAfterSave(advance);
                            }}
                          />
        ) : null}
      </TableCell>
    );
  };

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <Table className="w-full border-separate border-spacing-0">
        <TableHeader>
          {headerGroups.map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.depth === 0 ? (
                <TableHead
                  rowSpan={headerGroups.length}
                  className="sticky left-0 top-0 z-30 min-w-80 border-r border-b rounded-tl-xl bg-card px-3 py-2 text-left text-xs font-semibold text-muted-foreground"
                >
                  Группы / Классы
                </TableHead>
              ) : null}

              {headerGroup.headers.map((header) => {
                const collapsedHeader = isCollapsedHeader(header);

                if (collapsedHeader && headerGroup.depth > 0) {
                  return null;
                }

                if (collapsedHeader && headerGroup.depth === 0) {
                  const groupKey = parseCollapsedGroupKey(header.column.id);
                  const groupDef = SUBJECT_COLUMN_GROUPS.find((item) => item.key === groupKey);

                  return (
                    <TableHead
                      key={header.id}
                      rowSpan={headerGroups.length}
                      className="sticky z-20 w-12 min-w-12 border-r border-b bg-card px-1 py-1 text-center"
                      style={{ top: `${headerGroup.depth * 40}px` }}
                    >
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => {
                          if (groupKey) {
                            onToggleColumnGroup(groupKey);
                          }
                        }}
                        aria-label={`Развернуть группу ${groupDef?.label ?? "предметов"}`}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </TableHead>
                  );
                }

                if (header.isPlaceholder) {
                  return null;
                }

                if (header.subHeaders.length > 0) {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className="sticky z-20 border-r border-b bg-card px-2 py-2"
                      style={{ top: `${headerGroup.depth * 40}px` }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-muted-foreground">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          className="cursor-pointer"
                          onClick={() => {
                            const groupKey = parseGroupHeaderKey(header.column.id);
                            if (groupKey) {
                              onToggleColumnGroup(groupKey);
                            }
                          }}
                          aria-label="Свернуть группу предметов"
                        >
                          <Minus className="size-3.5" />
                        </Button>
                      </div>
                    </TableHead>
                  );
                }

                return (
                  <TableHead
                    key={header.id}
                    className="sticky z-20 min-w-32 border-r border-b bg-card px-2 py-2 text-left text-xs font-medium"
                    style={{ top: `${headerGroup.depth * 40}px` }}
                    title={String(header.column.columnDef.header ?? "")}
                  >
                    <span className="line-clamp-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                  </TableHead>
                );
              })}

              {headerGroup.depth === 0 ? (
                <TableHead
                  rowSpan={headerGroups.length}
                  className="sticky right-0 top-0 z-30 min-w-28 border-l border-b rounded-tr-xl bg-card px-3 py-2 text-right text-xs font-semibold text-muted-foreground"
                >
                  Итого уроков
                </TableHead>
              ) : null}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="sticky left-0 z-10 border-r border-b bg-card px-3 py-2">
                <div
                  className="flex items-center gap-1.5"
                  style={{ paddingLeft: `${row.depth * 18}px` }}
                >
                  <span className="inline-block w-6" />

                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{GROUP_TYPE_LABELS[row.type]}</div>
                  </div>
                </div>
              </TableCell>

              {visibleLeafColumns.map((column) => {
                if (column.id.startsWith("collapsed::")) {
                  const groupKey = parseCollapsedGroupKey(column.id);
                  if (!groupKey) {
                    return null;
                  }

                  return renderGridCell(row, {
                    kind: "collapsed",
                    groupKey,
                  });
                }

                const subject = subjectsByColumnId.get(column.id);

                if (!subject) {
                  return null;
                }

                return renderGridCell(row, { kind: "subject", subject });
              })}

              <TableCell className="sticky right-0 z-10 border-l border-b bg-card px-3 py-2 text-right">
                {row.type === "CLASS" ? (
                  <span className="text-sm font-semibold">{rightTotalByClass.get(row.id) ?? 0}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}

          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={2 + visibleLeafColumns.length}
                className="px-4 py-8 text-center text-sm text-muted-foreground"
              >
                Нет данных для отображения.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <div className="border-t bg-muted/20 px-3 py-2">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          Быстрый ввод: {quickInputMode ? `${QUICK_INPUT_DEFAULT_DURATION}м + ${QUICK_INPUT_DEFAULT_BREAK}м` : "кастомные параметры"}
        </span>
      </div>
    </div>
  );
}
