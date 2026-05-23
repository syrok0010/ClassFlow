import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type FocusEvent,
} from "react";
import type { GroupWithDetails } from "../_lib/types";
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { groupNameSchema, type InlineCreateGroupInput } from "../_lib/group-schemas";
import { InlineCreateRow } from "./inline-create-row";
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
  Check,
  FolderOpen,
  School,
  X,
} from "lucide-react";
import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
import { cn } from "@/lib/utils";
import {
  ClassGroupsMultiSelect,
  type ClassGroupOption,
} from "./class-groups-multi-select";

interface GroupsTreeTableProps {
  groups: GroupWithDetails[];
  classOptions: ClassGroupOption[];
  isAddingRow: boolean;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onStartAddRow: () => void;
  onCancelAddRow: () => void;
  onCreateGroup: (data: InlineCreateGroupInput) => Promise<boolean>;
  onRenameGroup: (id: string, name: string) => Promise<void>;
  onUpdateLinkedClasses: (id: string, linkedClassIds: string[]) => Promise<void>;
  onDeleteGroup: (group: GroupWithDetails) => Promise<void>;
  onOpenTransferList: (group: GroupWithDetails) => void;
  onOpenSplitter: (group: GroupWithDetails) => void;
  onOpenSubgroupEditor: (group: GroupWithDetails) => void;
}

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
  classOptions,
  isAddingRow,
  hasActiveFilters,
  onResetFilters,
  onStartAddRow,
  onCancelAddRow,
  onCreateGroup,
  onRenameGroup,
  onUpdateLinkedClasses,
  onDeleteGroup,
  onOpenTransferList,
  onOpenSplitter,
  onOpenSubgroupEditor,
}: GroupsTreeTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLinkedClassesId, setEditingLinkedClassesId] = useState<string | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] =
    useState<GroupWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteStudentsCount = confirmDeleteGroup?._count.studentGroups ?? 0;
  const deleteSubGroupsCount = confirmDeleteGroup?.subGroups.length ?? 0;

  const handleStartRename = useCallback((group: GroupWithDetails) => {
    setEditingLinkedClassesId(null);
    setEditingId(group.id);
  }, []);

  const handleStartEditLinkedClasses = useCallback((group: GroupWithDetails) => {
    setEditingId(null);
    setEditingLinkedClassesId(group.id);
  }, []);

  const handleSaveRename = useCallback(
    async (newName: string) => {
      if (editingId && newName.trim()) {
        await onRenameGroup(editingId, newName.trim());
      }
      setEditingId(null);
    },
    [editingId, onRenameGroup]
  );

  const handleCancelRename = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleSaveLinkedClasses = useCallback(
    async (linkedClassIds: string[]) => {
      if (editingLinkedClassesId) {
        await onUpdateLinkedClasses(editingLinkedClassesId, linkedClassIds);
      }
      setEditingLinkedClassesId(null);
    },
    [editingLinkedClassesId, onUpdateLinkedClasses]
  );

  const handleCancelEditLinkedClasses = useCallback(() => {
    setEditingLinkedClassesId(null);
  }, []);

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

  const handleDoubleClickName = useCallback((group: GroupWithDetails) => {
    handleStartRename(group);
  }, [handleStartRename]);

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
        size: 280,
        cell: ({ row }) => {
          const group = row.original;
          if (row.depth > 0) return "—";

          if (group.type === "ELECTIVE_GROUP") {
            if (editingLinkedClassesId === group.id) {
              return (
                <InlineLinkedClassesInput
                  defaultValue={group.linkedClasses.map((item) => item.id)}
                  options={classOptions}
                  onSave={handleSaveLinkedClasses}
                  onCancel={handleCancelEditLinkedClasses}
                />
              );
            }

            return group.linkedClasses.length > 0
              ? group.linkedClasses.map((item) => item.name).join(", ")
              : "—";
          }

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
              onClick={() => {
                if (group.type === "SUBJECT_SUBGROUP") {
                  onOpenSubgroupEditor(group);
                  return;
                }

                onOpenTransferList(group);
              }}
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
              onEditLinkedClasses={() => handleStartEditLinkedClasses(group)}
              onManageStudents={() => onOpenTransferList(group)}
              onEditSubgroups={() => onOpenSubgroupEditor(group)}
              onDelete={() => setConfirmDeleteGroup(group)}
            />
          );
        },
      },
    ],
    [
      editingId,
      editingLinkedClassesId,
      classOptions,
      handleCancelEditLinkedClasses,
      handleCancelRename,
      handleDoubleClickName,
      handleSaveLinkedClasses,
      handleSaveRename,
      handleStartEditLinkedClasses,
      handleStartRename,
      onOpenTransferList,
      onOpenSplitter,
      onOpenSubgroupEditor,
    ]
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
                classOptions={classOptions}
                onSave={onCreateGroup}
                onCancel={onCancelAddRow}
              />
            )}

            {table.getRowModel().rows.length === 0 && !isAddingRow && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <FilterableEmptyState
                    hasFilters={hasActiveFilters}
                    empty={{
                      icon: <FolderOpen />,
                      title: "Нет групп",
                      description: "Нажмите \"Добавить класс/группу\", чтобы начать.",
                      action: <Button onClick={onStartAddRow}>+ Добавить класс/группу</Button>,
                    }}
                    onResetFilters={onResetFilters}
                  />
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

      {confirmDeleteGroup && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setConfirmDeleteGroup(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить группу?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-1">
                <span className="block">
                  Вы собираетесь удалить группу &laquo;{confirmDeleteGroup.name}&raquo;.
                </span>
                {deleteStudentsCount > 0 && (
                  <span className="block">
                    Из этой группы будут отчислены <span className="font-semibold">{deleteStudentsCount} учеников</span>.
                  </span>
                )}
                {deleteSubGroupsCount > 0 && (
                  <span className="block">
                    Также будут удалены <span className="font-semibold">{deleteSubGroupsCount} подгрупп</span>.
                  </span>
                )}
                <span className="block">
                  Связанные записи расписания и недельного шаблона также будут удалены.
                </span>
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
      )}
    </>
  );
}

function InlineRenameInput({
  defaultValue,
  onSave,
  onCancel,
}: {
  defaultValue: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    requestAnimationFrame(() => {
      mountedRef.current = true;
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const handleSave = () => {
    const parsed = groupNameSchema.safeParse(value);

    if (!parsed.success || parsed.data === defaultValue.trim()) {
      onCancel();
      return;
    }

    onSave(parsed.data);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (!mountedRef.current) return;
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    handleSave();
  };

  return (
    <div ref={containerRef} className="flex items-center gap-1">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={handleBlur}
        className="h-7 min-w-[8rem] max-w-xs"
      />
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleSave}
        title="Сохранить"
      >
        <Check className="size-3.5" />
      </Button>
    </div>
  );
}

function GroupActionMenu({
  group,
  onRename,
  onEditLinkedClasses,
  onManageStudents,
  onEditSubgroups,
  onDelete,
}: {
  group: GroupWithDetails;
  onRename: () => void;
  onEditLinkedClasses: () => void;
  onManageStudents: () => void;
  onEditSubgroups: () => void;
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
        {group.type === "ELECTIVE_GROUP" && (
          <DropdownMenuItem onClick={onEditLinkedClasses}>
            <School className="size-4" />
            Изменить классы
          </DropdownMenuItem>
        )}
        {group.type !== "SUBJECT_SUBGROUP" && (
          <DropdownMenuItem onClick={onManageStudents}>
            <UserPlus className="size-4" />
            Управление учениками
          </DropdownMenuItem>
        )}
        {group.type === "SUBJECT_SUBGROUP" && (
          <DropdownMenuItem onClick={onEditSubgroups}>
            <Scissors className="size-4" />
            Редактировать подгруппы
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" />
          Удалить группу
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InlineLinkedClassesInput({
  defaultValue,
  options,
  onSave,
  onCancel,
}: {
  defaultValue: string[];
  options: ClassGroupOption[];
  onSave: (linkedClassIds: string[]) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);

  const defaultSorted = useMemo(() => [...defaultValue].sort(), [defaultValue]);
  const currentSorted = useMemo(() => [...value].sort(), [value]);
  const hasChanges =
    defaultSorted.length !== currentSorted.length ||
    defaultSorted.some((item, index) => item !== currentSorted[index]);

  const handleSave = () => {
    if (value.length === 0 || !hasChanges) {
      onCancel();
      return;
    }

    onSave(value);
  };

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-72 flex-1">
        <ClassGroupsMultiSelect
          options={options}
          selectedIds={value}
          onChange={setValue}
          placeholder={options.length > 0 ? "Классы для кружка" : "Сначала создайте классы"}
          invalid={value.length === 0}
          disabled={options.length === 0}
          chipsClassName="min-h-7 py-0.5"
        />
        {value.length === 0 && (
          <p className="mt-1 text-xs text-destructive">
            Выберите хотя бы один класс
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleSave}
          title="Сохранить"
          disabled={value.length === 0}
        >
          <Check className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onCancel}
          title="Отмена"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
