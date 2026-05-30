import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type FocusEvent,
} from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import type { GroupWithDetails, SubjectOption } from "../_lib/types";
import type { GroupsCrudCommands } from "../_hooks/use-groups-crud";
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { groupNameSchema } from "../_lib/group-schemas";
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
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  BookOpen,
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
  electiveSubjects: SubjectOption[];
  isAddingRow: boolean;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onStartAddRow: () => void;
  onCancelAddRow: () => void;
  commands: GroupsCrudCommands;
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

const linkedClassIdsFormSchema = z
  .array(z.string().min(1))
  .min(1, "Выберите хотя бы один класс");

const electiveSubjectIdFormSchema = z
  .string()
  .min(1, "Выберите доп");

const renameFormSchema = z.object({
  name: groupNameSchema,
});

const linkedClassesFormSchema = z.object({
  linkedClassIds: linkedClassIdsFormSchema,
});

function haveSameIds(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((id) => right.includes(id))
  );
}

export function GroupsTreeTable({
  groups,
  classOptions,
  electiveSubjects,
  isAddingRow,
  hasActiveFilters,
  onResetFilters,
  onStartAddRow,
  onCancelAddRow,
  commands,
  onOpenTransferList,
  onOpenSplitter,
  onOpenSubgroupEditor,
}: GroupsTreeTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLinkedClassesId, setEditingLinkedClassesId] = useState<string | null>(null);
  const [editingElectiveSubjectId, setEditingElectiveSubjectId] = useState<string | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] =
    useState<GroupWithDetails | null>(null);

  const deleteStudentsCount = confirmDeleteGroup?._count.studentGroups ?? 0;
  const deleteSubGroupsCount = confirmDeleteGroup?.subGroups.length ?? 0;

  const handleStartRename = useCallback((group: GroupWithDetails) => {
    setEditingLinkedClassesId(null);
    setEditingElectiveSubjectId(null);
    setEditingId(group.id);
  }, []);

  const handleStartEditLinkedClasses = useCallback((group: GroupWithDetails) => {
    setEditingId(null);
    setEditingElectiveSubjectId(null);
    setEditingLinkedClassesId(group.id);
  }, []);

  const handleStartEditElectiveSubject = useCallback((group: GroupWithDetails) => {
    setEditingId(null);
    setEditingLinkedClassesId(null);
    setEditingElectiveSubjectId(group.id);
  }, []);

  const handleSaveRename = useCallback(
    async (newName: string) => {
      if (!editingId) {
        return;
      }

      const result = await commands.renameGroup.execute({
        id: editingId,
        name: newName.trim(),
      });

      if (result === null) {
        return;
      }
      setEditingId(null);
    },
    [commands.renameGroup, editingId]
  );

  const handleConfirmDelete = async () => {
    if (confirmDeleteGroup) {
      await commands.deleteGroup.execute(confirmDeleteGroup);
      setConfirmDeleteGroup(null);
    }
  };

  const handleDoubleClickName = useCallback((group: GroupWithDetails) => {
    handleStartRename(group);
  }, [handleStartRename]);

  const handleDoubleClickLinkedClasses = useCallback((group: GroupWithDetails) => {
    if (group.type !== "ELECTIVE_GROUP") {
      return;
    }

    handleStartEditLinkedClasses(group);
  }, [handleStartEditLinkedClasses]);

  const handleDoubleClickElectiveSubject = useCallback((group: GroupWithDetails) => {
    if (group.type !== "ELECTIVE_GROUP") {
      return;
    }

    handleStartEditElectiveSubject(group);
  }, [handleStartEditElectiveSubject]);

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
                onCancel={() => setEditingId(null)}
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
                  groupId={group.id}
                  defaultValue={group.linkedClasses.map((item) => item.id)}
                  options={classOptions}
                  command={commands.updateLinkedClasses}
                  onCancel={() => setEditingLinkedClassesId(null)}
                />
              );
            }

            return (
              <span
                className="cursor-default"
                onDoubleClick={() => handleDoubleClickLinkedClasses(group)}
                title="Двойной клик для изменения классов"
              >
                {group.linkedClasses.length > 0
                  ? group.linkedClasses.map((item) => item.name).join(", ")
                  : "—"}
              </span>
            );
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
          if (group.type === "ELECTIVE_GROUP") {
            if (editingElectiveSubjectId === group.id) {
              return (
                <InlineElectiveSubjectInput
                  groupId={group.id}
                  defaultValue={group.subjectId}
                  options={electiveSubjects}
                  command={commands.updateElectiveSubject}
                  onCancel={() => setEditingElectiveSubjectId(null)}
                />
              );
            }

            return group.subject ? (
              <span
                className="inline-flex max-w-full cursor-default items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs font-medium"
                onDoubleClick={() => handleDoubleClickElectiveSubject(group)}
                title="Двойной клик для изменения допа"
              >
                <BookOpen data-icon="inline-start" className="size-4" />
                {group.subject.name}
              </span>
            ) : (
              <span
                className="cursor-default text-sm text-muted-foreground"
                onDoubleClick={() => handleDoubleClickElectiveSubject(group)}
                title="Двойной клик для привязки допа"
              >
                Доп не привязан
              </span>
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
              onBindElectiveSubject={() => handleStartEditElectiveSubject(group)}
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
      editingElectiveSubjectId,
      editingLinkedClassesId,
      classOptions,
      electiveSubjects,
      handleDoubleClickElectiveSubject,
      handleDoubleClickLinkedClasses,
      handleDoubleClickName,
      handleStartEditElectiveSubject,
      handleStartEditLinkedClasses,
      handleSaveRename,
      handleStartRename,
      commands.updateElectiveSubject,
      commands.updateLinkedClasses,
      onOpenTransferList,
      onOpenSplitter,
      onOpenSubgroupEditor,
    ]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
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
                command={commands.createGroup}
                classOptions={classOptions}
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
              <AlertDialogCancel disabled={commands.deleteGroup.isPending}>
                Отмена
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={commands.deleteGroup.isPending}
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
  onSave: (newName: string) => Promise<void> | void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const form = useForm({
    defaultValues: {
      name: defaultValue,
    },
    validators: {
      onSubmit: renameFormSchema,
    },
    onSubmit: async ({ value }) => {
      const nextName = value.name.trim();
      if (nextName === defaultValue.trim()) {
        onCancel();
        return;
      }

      await onSave(nextName);
    },
  });

  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, []);

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    void form.handleSubmit();
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      <form.Field
        name="name"
        validators={{
          onBlur: groupNameSchema,
          onSubmit: groupNameSchema,
        }}
      >
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0}>
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void form.handleSubmit();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    onCancel();
                  }
                }}
                onBlur={(event) => {
                  field.handleBlur();
                  handleBlur(event);
                }}
                aria-invalid={field.state.meta.errors.length > 0}
                className="h-7 min-w-32 max-w-xs"
              />
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting] as const}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => void form.handleSubmit()}
                    disabled={!canSubmit || isSubmitting}
                    title="Сохранить"
                  >
                    {isSubmitting ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </div>
            {field.state.meta.isTouched ? (
              <FieldError
                errors={field.state.meta.errors}
                className="text-xs"
              />
            ) : null}
          </Field>
        )}
      </form.Field>
    </div>
  );
}

function InlineLinkedClassesInput({
  groupId,
  defaultValue,
  options,
  command,
  onCancel,
}: {
  groupId: string;
  defaultValue: string[];
  options: ClassGroupOption[];
  command: GroupsCrudCommands["updateLinkedClasses"];
  onCancel: () => void;
}) {
  const form = useForm({
    defaultValues: {
      linkedClassIds: defaultValue,
    },
    validators: {
      onSubmit: linkedClassesFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (haveSameIds(value.linkedClassIds, defaultValue)) {
        onCancel();
        return;
      }

      const result = await command.execute({
        id: groupId,
        linkedClassIds: value.linkedClassIds,
      });
      if (result !== null) {
        onCancel();
      }
    },
  });

  return (
    <div className="flex min-w-64 items-start gap-1">
      <form.Field
        name="linkedClassIds"
        validators={{
          onChange: linkedClassIdsFormSchema,
          onSubmit: linkedClassIdsFormSchema,
        }}
      >
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0}>
            <ClassGroupsMultiSelect
              options={options}
              selectedIds={field.state.value}
              onChange={(next) => field.handleChange(next)}
              placeholder={
                options.length > 0
                  ? "Классы для кружка"
                  : "Сначала создайте классы"
              }
              invalid={field.state.meta.errors.length > 0}
              disabled={options.length === 0}
            />
            <FieldError errors={field.state.meta.errors} className="text-xs" />
          </Field>
        )}
      </form.Field>
      <form.Subscribe
        selector={(state) =>
          [
            state.canSubmit,
            state.isSubmitting,
          ] as const
        }
      >
        {([canSubmit, isSubmitting]) => (
          <>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => void form.handleSubmit()}
              title="Сохранить"
              disabled={
                !canSubmit ||
                isSubmitting ||
                command.isPending
              }
            >
              {isSubmitting || command.isPending ? (
                <Spinner className="size-3.5" />
              ) : (
                <Check className="size-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onCancel}
              title="Отмена"
              disabled={isSubmitting || command.isPending}
            >
              <X className="size-3.5" />
            </Button>
          </>
        )}
      </form.Subscribe>
    </div>
  );
}

function InlineElectiveSubjectInput({
  groupId,
  defaultValue,
  options,
  command,
  onCancel,
}: {
  groupId: string;
  defaultValue: string | null;
  options: SubjectOption[];
  command: GroupsCrudCommands["updateElectiveSubject"];
  onCancel: () => void;
}) {
  const subjectItems = useMemo(
    () => Object.fromEntries(options.map((option) => [option.id, option.name])),
    [options]
  );
  const subjectIdFormSchema = useMemo(
    () =>
      electiveSubjectIdFormSchema.refine(
        (subjectId) => options.some((option) => option.id === subjectId),
        "Выберите доп из списка"
      ),
    [options]
  );
  const electiveSubjectFormSchema = useMemo(
    () =>
      z.object({
        subjectId: subjectIdFormSchema,
      }),
    [subjectIdFormSchema]
  );
  const form = useForm({
    defaultValues: {
      subjectId: defaultValue ?? "",
    },
    validators: {
      onSubmit: electiveSubjectFormSchema,
    },
    onSubmit: async ({ value }) => {
      const subjectId = value.subjectId;

      if (subjectId === (defaultValue ?? "")) {
        onCancel();
        return;
      }

      const subject = options.find((option) => option.id === subjectId);

      const result = await command.execute({
        id: groupId,
        subject: subject!,
      });
      if (result !== null) {
        onCancel();
      }
    },
  });

  return (
    <div className="flex min-w-56 items-center gap-1">
      <form.Field
        name="subjectId"
        validators={{
          onChange: subjectIdFormSchema,
          onSubmit: subjectIdFormSchema,
        }}
      >
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0}>
            <Select
              value={field.state.value}
              onValueChange={(next) => field.handleChange(next ?? "")}
              items={subjectItems}
            >
              <SelectTrigger
                size="sm"
                className="h-8 min-w-44"
                aria-invalid={field.state.meta.errors.length > 0}
              >
                <SelectValue placeholder="Выберите доп" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={field.state.meta.errors} className="text-xs" />
          </Field>
        )}
      </form.Field>
      <form.Subscribe
        selector={(state) =>
          [state.canSubmit, state.isSubmitting] as const
        }
      >
        {([canSubmit, isSubmitting]) => (
          <>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => void form.handleSubmit()}
              title="Сохранить"
              disabled={
                !canSubmit ||
                isSubmitting ||
                command.isPending
              }
            >
              {isSubmitting || command.isPending ? (
                <Spinner className="size-3.5" />
              ) : (
                <Check className="size-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onCancel}
              title="Отмена"
              disabled={isSubmitting || command.isPending}
            >
              <X className="size-3.5" />
            </Button>
          </>
        )}
      </form.Subscribe>
    </div>
  );
}

function GroupActionMenu({
  group,
  onRename,
  onEditLinkedClasses,
  onBindElectiveSubject,
  onManageStudents,
  onEditSubgroups,
  onDelete,
}: {
  group: GroupWithDetails;
  onRename: () => void;
  onEditLinkedClasses: () => void;
  onBindElectiveSubject: () => void;
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
            <BookOpen className="size-4" />
            Изменить классы
          </DropdownMenuItem>
        )}
        {group.type === "ELECTIVE_GROUP" && (
          <DropdownMenuItem onClick={onBindElectiveSubject}>
            <BookOpen className="size-4" />
            Привязать доп
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
