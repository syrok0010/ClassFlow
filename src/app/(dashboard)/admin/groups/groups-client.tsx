"use client";

import { useState, useCallback } from "react";
import type { GroupType } from "@/generated/prisma/client";
import type { GroupWithDetails, StudentForAssignment, SubjectOption } from "./types";
import { GroupsToolbar } from "./components/groups-toolbar";
import { GroupsTreeTable } from "./components/groups-tree-table";
import { StudentAssignmentDialog } from "./components/student-assignment-dialog";
import { SplitterDialog } from "./components/splitter-dialog";
import {
  createGroupAction,
  updateGroupAction,
  deleteGroupAction,
  assignStudentsToGroupAction,
  removeStudentsFromGroupAction,
  getStudentsForAssignment,
  getGroupStudents,
  createSubgroupsFromSplit,
} from "./actions";
import { toast } from "sonner";

type Props = {
  initialGroups: GroupWithDetails[];
  subjects: SubjectOption[];
};

export function GroupsClient({ initialGroups, subjects }: Props) {
  const [groups, setGroups] = useState<GroupWithDetails[]>(initialGroups);
  const [filterType, setFilterType] = useState<"ALL" | "CLASS" | "ELECTIVE_GROUP">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingRow, setIsAddingRow] = useState(false);

  // Transfer list state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferGroup, setTransferGroup] = useState<GroupWithDetails | null>(null);
  const [transferStudents, setTransferStudents] = useState<{
    assigned: StudentForAssignment[];
    available: StudentForAssignment[];
  } | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);

  // Splitter state
  const [splitterOpen, setSplitterOpen] = useState(false);
  const [splitterGroup, setSplitterGroup] = useState<GroupWithDetails | null>(null);
  const [splitterStudents, setSplitterStudents] = useState<StudentForAssignment[]>([]);

  // ─── Filter groups ──────────────────────────────────────────────────

  const filteredGroups = groups.filter((g) => {
    if (filterType === "CLASS" && g.type !== "CLASS") return false;
    if (filterType === "ELECTIVE_GROUP" && g.type !== "ELECTIVE_GROUP") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = g.name.toLowerCase().includes(q);
      const subMatch = g.subGroups?.some((s) =>
        s.name.toLowerCase().includes(q)
      );
      if (!nameMatch && !subMatch) return false;
    }
    return true;
  });

  // ─── Create group (inline) ─────────────────────────────────────────

  const handleCreateGroup = useCallback(
    async (data: { name: string; type: GroupType; grade?: number | null }) => {
      try {
        const newGroup = await createGroupAction(data);
        const groupWithDetails: GroupWithDetails = {
          ...newGroup,
          subject: null,
          _count: { studentGroups: 0 },
          subGroups: [],
        };
        setGroups((prev) => [groupWithDetails, ...prev]);
        toast.success(`Группа "${data.name}" создана`);
        return true;
      } catch {
        toast.error("Ошибка при создании группы");
        return false;
      }
    },
    []
  );

  // ─── Rename group ──────────────────────────────────────────────────

  const handleRenameGroup = useCallback(
    async (id: string, name: string) => {
      try {
        await updateGroupAction(id, { name });
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id === id) return { ...g, name };
            return {
              ...g,
              subGroups: g.subGroups.map((s) =>
                s.id === id ? { ...s, name } : s
              ),
            };
          })
        );
        toast.success("Группа переименована");
      } catch {
        toast.error("Ошибка при переименовании");
      }
    },
    []
  );

  // ─── Delete group ──────────────────────────────────────────────────

  const handleDeleteGroup = useCallback(
    async (group: GroupWithDetails) => {
      try {
        await deleteGroupAction(group.id);
        setGroups((prev) => {
          // Remove from top level
          const filtered = prev.filter((g) => g.id !== group.id);
          // Also remove from subGroups
          return filtered.map((g) => ({
            ...g,
            subGroups: g.subGroups.filter((s) => s.id !== group.id),
          }));
        });
        toast.success(`Группа "${group.name}" удалена`);
      } catch {
        toast.error("Ошибка при удалении группы");
      }
    },
    []
  );

  // ─── Open Transfer List ────────────────────────────────────────────

  const handleOpenTransferList = useCallback(
    async (group: GroupWithDetails) => {
      setTransferLoading(true);
      setTransferGroup(group);
      setTransferDialogOpen(true);
      try {
        const data = await getStudentsForAssignment(group.id, group.type);
        setTransferStudents(data);
      } catch {
        toast.error("Ошибка загрузки учеников");
      } finally {
        setTransferLoading(false);
      }
    },
    []
  );

  const handleTransferSave = useCallback(
    async (toAssign: string[], toRemove: string[]) => {
      if (!transferGroup) return;
      try {
        if (toAssign.length > 0) {
          await assignStudentsToGroupAction(transferGroup.id, toAssign);
        }
        if (toRemove.length > 0) {
          await removeStudentsFromGroupAction(transferGroup.id, toRemove);
        }
        // Update local state
        const newCount =
          (transferStudents?.assigned.length ?? 0) + toAssign.length - toRemove.length;
        setGroups((prev) =>
          prev.map((g) => {
            if (g.id === transferGroup.id) {
              return { ...g, _count: { studentGroups: newCount } };
            }
            return {
              ...g,
              subGroups: g.subGroups.map((s) =>
                s.id === transferGroup.id
                  ? { ...s, _count: { studentGroups: newCount } }
                  : s
              ),
            };
          })
        );
        setTransferDialogOpen(false);
        toast.success("Состав группы обновлен");
      } catch {
        toast.error("Ошибка при обновлении состава");
      }
    },
    [transferGroup, transferStudents]
  );

  // ─── Open Splitter ─────────────────────────────────────────────────

  const handleOpenSplitter = useCallback(
    async (group: GroupWithDetails) => {
      setSplitterGroup(group);
      setSplitterOpen(true);
      try {
        const students = await getGroupStudents(group.id);
        setSplitterStudents(students);
      } catch {
        toast.error("Ошибка загрузки учеников");
      }
    },
    []
  );

  const handleSplitterSave = useCallback(
    async (data: {
      parentGroupId: string;
      subjectId: string;
      subgroups: { name: string; studentIds: string[] }[];
    }) => {
      try {
        await createSubgroupsFromSplit(data);
        // Refresh from server by reloading
        window.location.reload();
        toast.success("Подгруппы созданы");
      } catch {
        toast.error("Ошибка при создании подгрупп");
      }
    },
    []
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Справочник групп и классов
        </h1>
      </div>

      <GroupsToolbar
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onAddGroup={() => setIsAddingRow(true)}
      />

      <GroupsTreeTable
        groups={filteredGroups}
        isAddingRow={isAddingRow}
        onCancelAddRow={() => setIsAddingRow(false)}
        onCreateGroup={handleCreateGroup}
        onRenameGroup={handleRenameGroup}
        onDeleteGroup={handleDeleteGroup}
        onOpenTransferList={handleOpenTransferList}
        onOpenSplitter={handleOpenSplitter}
      />

      <StudentAssignmentDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        group={transferGroup}
        students={transferStudents}
        loading={transferLoading}
        onSave={handleTransferSave}
      />

      <SplitterDialog
        open={splitterOpen}
        onOpenChange={setSplitterOpen}
        group={splitterGroup}
        students={splitterStudents}
        subjects={subjects}
        onSave={handleSplitterSave}
      />
    </div>
  );
}
