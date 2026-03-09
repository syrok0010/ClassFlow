"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { GroupType } from "@/generated/prisma/client";
import type { GroupWithDetails } from "../types";
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type Row,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  ChevronRight,
  MoreHorizontal,
  Scissors,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  groups: GroupWithDetails[];
  isAddingRow: boolean;
  onCancelAddRow: () => void;
  onCreateGroup: (data: {
    name: string;
    type: GroupType;
    grade?: number | null;
  }) => Promise<boolean>;
  onRenameGroup: (id: string, name: string) => Promise<void>;
  onDeleteGroup: (group: GroupWithDetails) => Promise<void>;
  onOpenTransferList: (group: GroupWithDetails) => void;
  onOpenSplitter: (group: GroupWithDetails) => void;
};

const TYPE_LABELS: Record<string, string> = {
  CLASS: "Класс",
  ELECTIVE_GROUP: "Кружок",
  SUBJECT_SUBGROUP: "Подгруппа",
  KINDERGARTEN_GROUP: "Детсад",
};

const TYPE_STYLES: Record<string, string> = {
  CLASS: "bg-blue-50 text-blue-700 ring-blue-600/20",
  ELECTIVE_GROUP: "bg-purple-50 text-purple-700 ring-purple-600/20",
  SUBJECT_SUBGROUP: "bg-green-50 text-green-700 ring-green-600/20",
  KINDERGARTEN_GROUP: "bg-orange-50 text-orange-700 ring-orange-600/20",
};

export function GroupsTreeTable({
  groups,
  isAddingRow,
  onCancelAddRow,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onOpenTransferList,
  onOpenSplitter,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] =
    useState<GroupWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStartRename = (group: GroupWithDetails) => {
    setEditingId(group.id);
  };

  const handleSaveRename = async (newName: string) => {
    if (editingId && newName.trim()) {
      await onRenameGroup(editingId, newName.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = () => {
    setEditingId(null);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteGroup) {
      setIsDeleting(true);
      try {
        await onDeleteGroup(confirmDeleteGroup);
      } finally {
        setIsDeleting(false);
        setConfirmDeleteGroup(null);
      }
    }
  };

  // Double-click to rename handler
  const handleDoubleClickName = (group: GroupWithDetails) => {
    handleStartRename(group);
  };

  // ─── TanStack Table columns ────────────────────────────────────────

  const columns = useMemo<ColumnDef<GroupWithDetails>[]>(
    () => [
      {
        id: "expander",
        header: () => null,
        size: 40,
        cell: ({ row }) => {
          if (!row.getCanExpand()) return null;
          return (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={row.getToggleExpandedHandler()}
            >
              <ChevronRight
                className={cn(
                  "size-4 transition-transform",
                  row.getIsExpanded() && "rotate-90"
                )}
              />
            </Button>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Название",
        cell: ({ row }) => {
          const group = row.original;
          const isSubGroup = row.depth > 0;

          if (editingId === group.id) {
            return (
              <InlineRenameInput
                defaultValue={group.name}
                onSave={handleSaveRename}
                onCancel={handleCancelRename}
              />
            );
          }

          return (
            <span
              className={cn(
                "flex items-center gap-2 cursor-default",
                isSubGroup && "pl-6"
              )}
              onDoubleClick={() => handleDoubleClickName(group)}
              title="Двойной клик для переименования"
            >
              {isSubGroup && (
                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
              )}
              {group.name}
            </span>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Тип",
        size: 144,
        cell: ({ row }) => {
          const group = row.original;
          return (
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                TYPE_STYLES[group.type] ?? ""
              )}
            >
              {TYPE_LABELS[group.type] ?? group.type}
            </span>
          );
        },
      },
      {
        accessorKey: "grade",
        header: "Параллель",
        size: 144,
        cell: ({ row }) => {
          const group = row.original;
          if (row.depth > 0) return "—";
          return group.grade ? `${group.grade} класс` : "—";
        },
      },
      {
        id: "students",
        header: "Ученики",
        size: 160,
        cell: ({ row }) => {
          const group = row.original;
          return (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-sm"
              onClick={() => onOpenTransferList(group)}
            >
              {group._count.studentGroups} чел.
            </Button>
          );
        },
      },
      {
        id: "actions-split",
        header: () => null,
        size: 208,
        cell: ({ row }) => {
          const group = row.original;
          if (row.depth > 0) {
            // Show subject for subgroups
            if (group.subject) {
              return (
                <span className="text-xs text-muted-foreground">
                  {group.subject.name}
                </span>
              );
            }
            return null;
          }
          if (group.type === "CLASS") {
            return (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenSplitter(group)}
              >
                <Scissors className="size-3.5" data-icon="inline-start" />
                Разделить на подгруппы
              </Button>
            );
          }
          return null;
        },
      },
      {
        id: "actions-menu",
        header: () => null,
        size: 48,
        cell: ({ row }) => {
          const group = row.original;
          return (
            <GroupActionMenu
              group={group}
              onRename={() => handleStartRename(group)}
              onManageStudents={() => onOpenTransferList(group)}
              onDelete={() => setConfirmDeleteGroup(group)}
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingId, onOpenTransferList, onOpenSplitter]
  );

  const table = useReactTable({
    data: groups,
    columns,
    getSubRows: (row) => (row.subGroups?.length > 0 ? row.subGroups : undefined),
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => (row.original.subGroups?.length ?? 0) > 0,
  });

  return (
    <>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <Table>
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
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isAddingRow && (
              <InlineCreateRow
                onSave={onCreateGroup}
                onCancel={onCancelAddRow}
              />
            )}

            {table.getRowModel().rows.length === 0 && !isAddingRow && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-10">
                  <p className="text-muted-foreground">
                    Нет групп. Нажмите &laquo;Добавить класс/группу&raquo; для
                    начала.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  row.depth > 0 && "bg-muted/30"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      cell.column.id === "name" && "font-medium"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation AlertDialog */}
      <AlertDialog
        open={!!confirmDeleteGroup}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteGroup(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить группу?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь удалить группу
              &laquo;{confirmDeleteGroup?.name}&raquo;.
              {(confirmDeleteGroup?._count.studentGroups ?? 0) > 0 && (
                <>
                  {" "}
                  Из этой группы будут отчислены{" "}
                  <strong>
                    {confirmDeleteGroup?._count.studentGroups} учеников
                  </strong>
                  .
                </>
              )}
              {(confirmDeleteGroup?.subGroups?.length ?? 0) > 0 && (
                <>
                  {" "}
                  Также будут удалены{" "}
                  <strong>
                    {confirmDeleteGroup?.subGroups.length} подгрупп
                  </strong>
                  .
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Отмена
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Inline Create Row ───────────────────────────────────────────────────────

function InlineCreateRow({
  onSave,
  onCancel,
}: {
  onSave: (data: {
    name: string;
    type: GroupType;
    grade?: number | null;
  }) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>("CLASS");
  const [grade, setGrade] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const success = await onSave({
      name: name.trim(),
      type,
      grade: grade ? parseInt(grade, 10) : null,
    });
    if (success) {
      setName("");
      setGrade("");
      nameRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <TableRow className="bg-primary/5 animate-in fade-in-0 slide-in-from-top-1">
      <TableCell />
      <TableCell>
        <Input
          ref={nameRef}
          placeholder="Название (напр. 10А)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-40"
        />
      </TableCell>
      <TableCell>
        <Select
          value={type}
          onValueChange={(v) => setType(v as GroupType)}
          items={{
            CLASS: "Класс",
            ELECTIVE_GROUP: "Кружок",
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CLASS">Класс</SelectItem>
            <SelectItem value="ELECTIVE_GROUP">Кружок</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          placeholder="Параллель"
          type="number"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-20"
        />
      </TableCell>
      <TableCell colSpan={2}>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSubmit} disabled={!name.trim()}>
            Сохранить
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Отмена
          </Button>
        </div>
      </TableCell>
      <TableCell />
    </TableRow>
  );
}

// ─── Inline Rename Input ─────────────────────────────────────────────────────

function InlineRenameInput({
  defaultValue,
  onSave,
  onCancel,
}: {
  defaultValue: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const handleSave = () => {
    onSave(value);
  };

  return (
    <Input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") onCancel();
      }}
      onBlur={handleSave}
      className="h-7 min-w-[8rem] max-w-xs"
    />
  );
}

// ─── Action Menu ─────────────────────────────────────────────────────────────

function GroupActionMenu({
  group,
  onRename,
  onManageStudents,
  onDelete,
}: {
  group: GroupWithDetails;
  onRename: () => void;
  onManageStudents: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-xs" />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onRename}>
          <Pencil className="size-4" />
          Переименовать
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onManageStudents}>
          <UserPlus className="size-4" />
          Управление учениками
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" />
          Удалить группу
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
