import { useLayoutEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Header,
} from "@tanstack/react-table";
import {
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
  RequirementEntry,
  RequirementGroupNode,
  RequirementSubject,
  SubjectColumnGroupKey,
  RequirementMutationInput,
  NavigationDirection,
} from "../_lib/types";
import { RequirementGridCell } from "./requirement-grid-cell";

type ActiveCell = {
  groupId: string;
  subjectId: string;
};

type EditingCell = ActiveCell & {
  initialLessons?: number;
  instanceId: string;
};

type RequirementsMatrixTableProps = {
  rows: RequirementGroupNode[];
  subjects: RequirementSubject[];
  requirements: RequirementEntry[];
  quickInputMode: boolean;
  collapsedColumnGroups: Set<SubjectColumnGroupKey>;
  onToggleColumnGroup: (key: SubjectColumnGroupKey) => void;
  onSaveCell: (payload: RequirementMutationInput & { advance: NavigationDirection }) => Promise<void>;
};

const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  CLASS: "Класс",
  ELECTIVE_GROUP: "Кружок",
  KINDERGARTEN_GROUP: "Группа",
  SUBJECT_SUBGROUP: "Подгруппа",
};

function isCollapsedHeader(header: Header<RequirementGroupNode, unknown>): boolean {
  return header.column.id.startsWith("collapsed::");
}

function parseCollapsedGroupKey(id: string): SubjectColumnGroupKey | null {
  if (!id.startsWith("collapsed::")) {
    return null;
  }

  const key = id.replace("collapsed::", "");
  return ["REGIME", "ACADEMIC", "ELECTIVE_REQUIRED", "ELECTIVE_OPTIONAL"].includes(key) 
    ? (key as SubjectColumnGroupKey) 
    : null;
}

function parseGroupHeaderKey(id: string): SubjectColumnGroupKey | null {
  const key = id.startsWith("group::") ? id.replace("group::", "") : id;
  return ["REGIME", "ACADEMIC", "ELECTIVE_REQUIRED", "ELECTIVE_OPTIONAL"].includes(key) 
    ? (key as SubjectColumnGroupKey) 
    : null;
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

  const matrixColumns = useMemo<ColumnDef<RequirementGroupNode>[]>(() => {
    const columns: ColumnDef<RequirementGroupNode>[] = [];
    for (const group of SUBJECT_COLUMN_GROUPS) {
      const groupSubjects = subjectsByGroup.get(group.key) ?? [];

      if (groupSubjects.length === 0) {
        continue;
      }

      columns.push({
        id: getCollapsedGroupColumnId(group.key),
        header: () => null,
        size: 48,
        cell: () => null,
      });

      columns.push({
        id: group.key,
        header: () => group.label,
        columns: groupSubjects.map((subject) => ({
          id: getSubjectColumnId(subject.id),
          accessorFn: () => null,
          size: 136,
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

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: matrixColumns,
    state: { columnVisibility },
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

  const hasData = rows.length > 0 && visibleSubjects.length > 0;
  const groupExists = activeCell ? rows.some((r) => r.id === activeCell.groupId) : false;
  const subjectExists = activeCell ? visibleSubjects.some((s) => s.id === activeCell.subjectId) : false;

  if (hasData) {
    if (!activeCell || !groupExists || !subjectExists) {
      setActiveCell({ groupId: rows[0].id, subjectId: visibleSubjects[0].id });
    }
  } else if (activeCell !== null) {
    setActiveCell(null);
  }

  useLayoutEffect(() => {
    if (!activeCell) return;
    const target = document.querySelector<HTMLButtonElement>(
      `[data-cell-focus-id="${activeCell.groupId}:${activeCell.subjectId}"]`
    );
    target?.focus();
  }, [activeCell, editingCell]);

  const moveActiveCell = (direction: NavigationDirection) => {
    if (!activeCell || !hasData) {
      return;
    }

    if (direction === "stay") {
      if (editingCell)
        setEditingCell(null);
      return;
    }

    const rowIndex = rows.findIndex((row) => row.id === activeCell.groupId);
    const subjectIndex = visibleSubjects.findIndex((subject) => subject.id === activeCell.subjectId);

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
      groupId: rows[nextRowIndex].id,
      subjectId: visibleSubjects[nextSubjectIndex].id
    });

    if (editingCell) {
      setEditingCell(null);
    }
  };

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <Table className="w-full border-separate border-spacing-0">
        <TableHeader>
          {headerGroups.map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.depth === 0 && (
                <TableHead
                  rowSpan={headerGroups.length}
                  className="sticky left-0 top-0 z-30 min-w-80 border-r border-b rounded-tl-xl bg-card px-3 py-2 text-left text-xs font-semibold text-muted-foreground"
                >
                  Группы / Классы
                </TableHead>
              )}

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
                        onClick={() => groupKey && onToggleColumnGroup(groupKey)}
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

              {headerGroup.depth === 0 && (
                <TableHead
                  rowSpan={headerGroups.length}
                  className="sticky right-0 top-0 z-30 min-w-28 border-l border-b rounded-tr-xl bg-card px-3 py-2 text-right text-xs font-semibold text-muted-foreground"
                >
                  Итого уроков
                </TableHead>
              )}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="sticky left-0 z-10 border-r border-b bg-card px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{row.name}</div>
                  <div className="text-xs text-muted-foreground">{GROUP_TYPE_LABELS[row.type]}</div>
                </div>
              </TableCell>

              {visibleLeafColumns.map((column) => {
                const groupKey = parseCollapsedGroupKey(column.id);
                if (groupKey) {
                  return (
                    <TableCell key={`${row.id}:${groupKey}`} className="h-16 min-w-12 border-r border-b bg-muted/20 px-1 py-1">
                      <div className="h-full rounded-sm bg-muted/40" />
                    </TableCell>
                  );
                }

                const subject = subjectsByColumnId.get(column.id);

                if (!subject) {
                  return null;
                }

                const isActive = activeCell?.groupId === row.id && activeCell.subjectId === subject.id;
                const isEditing = editingCell?.groupId === row.id && editingCell.subjectId === subject.id;

                return (
                  <RequirementGridCell
                    key={`${row.id}:${subject.id}`}
                    row={row}
                    subject={subject}
                    entry={requirementsMap.get(`${row.id}:${subject.id}`) ?? null}
                    isActive={isActive}
                    editing={isEditing ? {
                      initialLessons: editingCell?.initialLessons,
                      instanceId: editingCell.instanceId
                    } : null}
                    quickInputMode={quickInputMode}
                    onActivate={() => {
                      setActiveCell({ groupId: row.id, subjectId: subject.id });
                      if (editingCell) setEditingCell(null);
                    }}
                    onStartEditing={(lessons) => {
                      setActiveCell({ groupId: row.id, subjectId: subject.id });
                      setEditingCell({
                        groupId: row.id,
                        subjectId: subject.id,
                        initialLessons: lessons,
                        instanceId: crypto.randomUUID(),
                      });
                    }}
                    onSave={async (p) => {
                      await onSaveCell({
                        groupId: row.id,
                        subjectId: subject.id,
                        ...p,
                      });
                      moveActiveCell(p.advance);
                    }}
                    onNavigate={moveActiveCell}
                  />
                );
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
