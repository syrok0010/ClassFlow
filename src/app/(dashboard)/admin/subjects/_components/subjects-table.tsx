import { Fragment, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SubjectWithUsage } from "../_lib/types";
import { groupSubjectsByType } from "../_lib/subject-table-utils";
import {
  SUBJECT_LABELS,
  SUBJECT_SELECT,
  SUBJECT_MARKERS,
} from "../_lib/constants";
import { SubjectTypeBadge } from "./subject-type-badge";
import { SubjectUsageCell } from "./subject-usage-cell";
import { InlineCreateRow } from "./inline-create-row";
import { InlineNameCell } from "./inline-name-cell";
import { SubjectsEmptyState } from "./subjects-empty-state";

interface SubjectsTableProps {
  allSubjectsCount: number;
  subjects: SubjectWithUsage[];
  isAddingRow: boolean;
  hasActiveFilters: boolean;
  onCreateSubject: (data: {
    name: string;
    type: SubjectWithUsage["type"];
  }) => Promise<boolean>;
  onRenameSubject: (id: string, name: string) => Promise<void>;
  onDeleteRequest: (subject: SubjectWithUsage) => void;
  onCancelAddRow: () => void;
  onCreateFirst: () => void;
  onResetFilters: () => void;
}

export function SubjectsTable({
  allSubjectsCount,
  subjects,
  isAddingRow,
  hasActiveFilters,
  onCreateSubject,
  onRenameSubject,
  onDeleteRequest,
  onCancelAddRow,
  onCreateFirst,
  onResetFilters,
}: SubjectsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<SubjectWithUsage>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Название",
        size: 420,
        cell: ({ row }) => {
          const subject = row.original;

          if (editingId === subject.id) {
            return (
              <InlineNameCell
                defaultValue={subject.name}
                onCancel={() => setEditingId(null)}
                onSave={(name) => {
                  void onRenameSubject(subject.id, name);
                  setEditingId(null);
                }}
              />
            );
          }

          return (
            <button
              type="button"
              onDoubleClick={() => setEditingId(subject.id)}
              className="block w-full cursor-default truncate text-left font-medium"
              title="Двойной клик для переименования"
            >
              {subject.name}
            </button>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Тип",
        size: 180,
        cell: ({ row }) => <SubjectTypeBadge type={row.original.type} />,
      },
      {
        id: "usage",
        header: "Где используется",
        size: 360,
        cell: ({ row }) => (
          <SubjectUsageCell
            subjectId={row.original.id}
            usage={row.original.usage}
          />
        ),
      },
      {
        id: "actions",
        header: () => null,
        size: 56,
        cell: ({ row }) => (
          <SubjectActionsMenu
            onRename={() => setEditingId(row.original.id)}
            onDelete={() => onDeleteRequest(row.original)}
          />
        ),
      },
    ],
    [editingId, onDeleteRequest, onRenameSubject]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: subjects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const rows = table.getRowModel().rows;

  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row.original.id, row])),
    [rows]
  );
  const groupedSubjects = useMemo(() => groupSubjectsByType(subjects), [subjects]);

  const hasRows = table.getRowModel().rows.length > 0;

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow">
      <Table className="table-fixed">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isAddingRow ? (
            <InlineCreateRow onSave={onCreateSubject} onCancel={onCancelAddRow} />
          ) : null}

          {!hasRows && !isAddingRow ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <SubjectsEmptyState
                  hasFilters={hasActiveFilters && allSubjectsCount > 0}
                  onResetFilters={onResetFilters}
                  onCreateFirst={onCreateFirst}
                />
              </TableCell>
            </TableRow>
          ) : null}

          {hasRows
            ? SUBJECT_SELECT.map((type) => {
                const typedSubjects = groupedSubjects.get(type) ?? [];
                if (typedSubjects.length === 0) {
                  return null;
                }

                return (
                  <Fragment key={`group-fragment-${type}`}>
                    <TableRow className="pointer-events-none select-none bg-muted/25 hover:bg-muted/25">
                      <TableCell colSpan={columns.length} className="border-t py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-4 w-1.5 rounded-full ${SUBJECT_MARKERS[type]}`}
                            aria-hidden
                          />
                          <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                            {SUBJECT_LABELS[type]}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {typedSubjects.map((subject) => {
                      const row = rowsById.get(subject.id);
                      if (!row) {
                        return null;
                      }

                      return (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </Fragment>
                );
              })
            : null}
        </TableBody>
      </Table>
    </div>
  );
}

function SubjectActionsMenu({
  onRename,
  onDelete,
}: {
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-xs" />}
        aria-label="Действия"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onRename}>
          <Pencil className="size-4" />
          Переименовать
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" />
          Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
