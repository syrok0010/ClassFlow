"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { GroupType } from "@/generated/prisma/client";
import type { GroupWithDetails } from "../types";
import {
  createGroupAction,
  updateGroupAction,
  deleteGroupAction,
  assignStudentsToGroupAction,
  removeStudentsFromGroupAction,
  getStudentsForAssignment,
  getGroupStudents,
  createSubgroupsFromSplit,
  getGroupsTree,
} from "../actions";
import { toast } from "sonner";

export function useGroupsCrud(initialGroups: GroupWithDetails[]) {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithDetails[]>(initialGroups);

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

  const handleRenameGroup = useCallback(
    async (id: string, name: string) => {
      try {
        await updateGroupAction(id, { name });

        const renameInTree = (groups: GroupWithDetails[]): GroupWithDetails[] =>
          groups.map((g) => ({
            ...g,
            ...(g.id === id ? { name } : {}),
            subGroups: renameInTree(g.subGroups),
          }));

        setGroups(renameInTree);
        toast.success("Группа переименована");
      } catch {
        toast.error("Ошибка при переименовании");
      }
    },
    []
  );

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

        let updatedCounts: Record<string, number> | null = null;
        if (toRemove.length > 0) {
          updatedCounts = await removeStudentsFromGroupAction(
            transferGroup.id,
            toRemove
          );
        }

        setGroups((prev) => {
          const applyCount = (g: GroupWithDetails): GroupWithDetails => {
            if (updatedCounts && g.id in updatedCounts) {
              const serverCount = updatedCounts[g.id];
              const assignDelta =
                g.id === transferGroup.id ? toAssign.length : 0;
              return {
                ...g,
                _count: { studentGroups: serverCount + assignDelta },
                subGroups: g.subGroups.map(applyCount),
              };
            }

            if (g.id === transferGroup.id) {
              return {
                ...g,
                _count: {
                  studentGroups:
                    currentAssignedCount + toAssign.length - toRemove.length,
                },
                subGroups: g.subGroups.map(applyCount),
              };
            }

            return { ...g, subGroups: g.subGroups.map(applyCount) };
          };

          return prev.map(applyCount);
        });

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
        router.refresh();
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
