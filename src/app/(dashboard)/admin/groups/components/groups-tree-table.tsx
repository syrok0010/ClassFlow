"use client";

import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import type { GroupType } from "@/generated/prisma/client";
import type { GroupWithDetails } from "../types";
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
  ChevronRight,
  MoreHorizontal,
  Users,
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteGroup, setConfirmDeleteGroup] =
    useState<GroupWithDetails | null>(null);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartRename = (group: GroupWithDetails) => {
    setEditingId(group.id);
    setEditingName(group.name);
  };

  const handleSaveRename = async () => {
    if (editingId && editingName.trim()) {
      await onRenameGroup(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName("");
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteGroup) {
      await onDeleteGroup(confirmDeleteGroup);
      setConfirmDeleteGroup(null);
    }
  };

  return (
    <>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Название</TableHead>
              <TableHead className="w-36">Тип</TableHead>
              <TableHead className="w-36">Параллель</TableHead>
              <TableHead className="w-40">Ученики</TableHead>
              <TableHead className="w-52" />
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAddingRow && (
              <InlineCreateRow
                onSave={onCreateGroup}
                onCancel={onCancelAddRow}
              />
            )}

            {groups.length === 0 && !isAddingRow && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <p className="text-muted-foreground">
                    Нет групп. Нажмите &laquo;Добавить класс/группу&raquo; для
                    начала.
                  </p>
                </TableCell>
              </TableRow>
            )}

            {groups.map((group) => (
              <Fragment key={group.id}>
                {/* Level 1 row */}
                <TableRow className="group/row">
                  <TableCell>
                    {group.subGroups.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => toggleExpanded(group.id)}
                      >
                        <ChevronRight
                          className={cn(
                            "size-4 transition-transform",
                            expandedIds.has(group.id) && "rotate-90"
                          )}
                        />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {editingId === group.id ? (
                      <InlineRenameInput
                        value={editingName}
                        onChange={setEditingName}
                        onSave={handleSaveRename}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      group.name
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                        group.type === "CLASS"
                          ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                          : "bg-purple-50 text-purple-700 ring-purple-600/20"
                      )}
                    >
                      {TYPE_LABELS[group.type] ?? group.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    {group.grade ? `${group.grade} класс` : "—"}
                  </TableCell>
                  <TableCell>
                    <button
                      className="text-sm text-primary hover:underline cursor-pointer"
                      onClick={() => onOpenTransferList(group)}
                    >
                      {group._count.studentGroups} чел.
                    </button>
                  </TableCell>
                  <TableCell>
                    {group.type === "CLASS" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenSplitter(group)}
                      >
                        <Scissors className="size-3.5" data-icon="inline-start" />
                        Разделить на подгруппы
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <GroupActionMenu
                      group={group}
                      onRename={() => handleStartRename(group)}
                      onManageStudents={() => onOpenTransferList(group)}
                      onDelete={() => setConfirmDeleteGroup(group)}
                    />
                  </TableCell>
                </TableRow>

                {/* Level 2 subgroup rows */}
                {expandedIds.has(group.id) &&
                  group.subGroups.map((sub) => (
                    <TableRow key={sub.id} className="bg-muted/30">
                      <TableCell />
                      <TableCell className="pl-10 font-medium">
                        {editingId === sub.id ? (
                          <InlineRenameInput
                            value={editingName}
                            onChange={setEditingName}
                            onSave={handleSaveRename}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <span className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                            {sub.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-green-50 text-green-700 ring-green-600/20">
                          {TYPE_LABELS[sub.type] ?? sub.type}
                        </span>
                      </TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>
                        <button
                          className="text-sm text-primary hover:underline cursor-pointer"
                          onClick={() => onOpenTransferList(sub)}
                        >
                          {sub._count.studentGroups} чел.
                        </button>
                      </TableCell>
                      <TableCell>
                        {sub.subject && (
                          <span className="text-xs text-muted-foreground">
                            {sub.subject.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <GroupActionMenu
                          group={sub}
                          onRename={() => handleStartRename(sub)}
                          onManageStudents={() => onOpenTransferList(sub)}
                          onDelete={() => setConfirmDeleteGroup(sub)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      {confirmDeleteGroup && (
        <DeleteConfirmDialog
          group={confirmDeleteGroup}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteGroup(null)}
        />
      )}
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
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <Input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSave();
        if (e.key === "Escape") onCancel();
      }}
      onBlur={onSave}
      className="h-7 w-40"
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

// ─── Delete Confirm Dialog ───────────────────────────────────────────────────

function DeleteConfirmDialog({
  group,
  onConfirm,
  onCancel,
}: {
  group: GroupWithDetails;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const studentCount = group._count.studentGroups;
  const subGroupCount = group.subGroups?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/10 backdrop-blur-xs" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-background p-4 ring-1 ring-foreground/10 shadow-lg">
        <h3 className="text-base font-medium mb-2">Удалить группу?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Вы собираетесь удалить группу &laquo;{group.name}&raquo;.
          {studentCount > 0 && (
            <>
              {" "}
              Из этой группы будут отчислены{" "}
              <strong>{studentCount} учеников</strong>.
            </>
          )}
          {subGroupCount > 0 && (
            <>
              {" "}
              Также будут удалены <strong>{subGroupCount} подгрупп</strong>.
            </>
          )}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Отмена
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Удалить
          </Button>
        </div>
      </div>
    </div>
  );
}
