"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { GroupType } from "@/generated/prisma/client";
import type { GroupWithDetails, StudentForAssignment } from "../types";
import {
  createGroupAction,
  updateGroupAction,
  deleteGroupAction,
  assignStudentsToGroupAction,
  removeStudentsFromGroupAction,
  getStudentsForAssignment,
  getGroupStudents,
  createSubgroupsFromSplit,
} from "../actions";
import { toast } from "sonner";

export function useGroupsCrud(initialGroups: GroupWithDetails[]) {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithDetails[]>(initialGroups);

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
          const filtered = prev.filter((g) => g.id !== group.id);
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

  // ─── Transfer List ─────────────────────────────────────────────────

  const handleTransferSave = useCallback(
    async (
      transferGroup: GroupWithDetails,
      currentAssignedCount: number,
      toAssign: string[],
      toRemove: string[]
    ) => {
      try {
        if (toAssign.length > 0) {
          await assignStudentsToGroupAction(transferGroup.id, toAssign);
        }
        if (toRemove.length > 0) {
          await removeStudentsFromGroupAction(transferGroup.id, toRemove);
        }
        const newCount = currentAssignedCount + toAssign.length - toRemove.length;
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
        toast.success("Состав группы обновлен");
      } catch {
        toast.error("Ошибка при обновлении состава");
      }
    },
    []
  );

  const loadStudentsForAssignment = useCallback(
    async (groupId: string, groupType: GroupType) => {
      return getStudentsForAssignment(groupId, groupType);
    },
    []
  );

  // ─── Splitter ──────────────────────────────────────────────────────

  const loadGroupStudents = useCallback(async (groupId: string) => {
    return getGroupStudents(groupId);
  }, []);

  const handleSplitterSave = useCallback(
    async (data: {
      parentGroupId: string;
      subjectId: string;
      subgroups: { name: string; studentIds: string[] }[];
    }) => {
      try {
        await createSubgroupsFromSplit(data);
        // Use router.refresh() instead of window.location.reload()
        // to update server data without breaking SPA navigation
        router.refresh();
        // Also update local state by refetching
        const { getGroupsTree } = await import("../actions");
        const freshGroups = await getGroupsTree();
        setGroups(freshGroups);
        toast.success("Подгруппы созданы");
      } catch {
        toast.error("Ошибка при создании подгрупп");
      }
    },
    [router]
  );

  return {
    groups,
    handleCreateGroup,
    handleRenameGroup,
    handleDeleteGroup,
    handleTransferSave,
    loadStudentsForAssignment,
    loadGroupStudents,
    handleSplitterSave,
  };
}
