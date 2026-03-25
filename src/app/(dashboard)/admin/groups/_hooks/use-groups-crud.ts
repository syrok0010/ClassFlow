"use client";

import { startTransition, useCallback, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import type { GroupType } from "@/generated/prisma/client";
import type { GroupWithDetails } from "../_lib/types";
import {
  assignStudentsToGroupAction,
  createGroupAction,
  createSubgroupsFromSplit,
  deleteGroupAction,
  getGroupStudents,
  getSubgroupEditorData,
  getStudentsForAssignment,
  removeStudentsFromGroupAction,
  saveSubgroupRedistribution,
  updateGroupAction,
} from "../_actions/group-actions";
import { toast } from "sonner";

type OptimisticAction =
  | {
      type: "add";
      group: GroupWithDetails;
    }
  | {
      type: "rename";
      id: string;
      name: string;
    }
  | {
      type: "remove";
      id: string;
    }
  | {
      type: "studentsDelta";
      id: string;
      delta: number;
    };

function applyRename(
  groups: GroupWithDetails[],
  id: string,
  name: string
): GroupWithDetails[] {
  return groups.map((group) => ({
    ...group,
    ...(group.id === id ? { name } : {}),
    subGroups: applyRename(group.subGroups, id, name),
  }));
}

function applyRemove(groups: GroupWithDetails[], id: string): GroupWithDetails[] {
  return groups
    .filter((group) => group.id !== id)
    .map((group) => ({
      ...group,
      subGroups: applyRemove(group.subGroups, id),
    }));
}

function applyStudentsDelta(
  groups: GroupWithDetails[],
  id: string,
  delta: number
): GroupWithDetails[] {
  return groups.map((group) => {
    const nextCount =
      group.id === id
        ? Math.max(0, group._count.studentGroups + delta)
        : group._count.studentGroups;

    return {
      ...group,
      _count: { studentGroups: nextCount },
      subGroups: applyStudentsDelta(group.subGroups, id, delta),
    };
  });
}

export function useGroupsCrud(initialGroups: GroupWithDetails[]) {
  const router = useRouter();
  const [groups, dispatchOptimistic] = useOptimistic(
    initialGroups,
    (state: GroupWithDetails[], action: OptimisticAction): GroupWithDetails[] => {
      switch (action.type) {
        case "add":
          return [action.group, ...state];
        case "rename":
          return applyRename(state, action.id, action.name);
        case "remove":
          return applyRemove(state, action.id);
        case "studentsDelta":
          return applyStudentsDelta(state, action.id, action.delta);
        default:
          return state;
      }
    }
  );

  const handleCreateGroup = useCallback(
    async (data: { name: string; type: GroupType; grade?: number | null }) => {
      const optimisticGroup: GroupWithDetails = {
        id: `optimistic-${crypto.randomUUID()}`,
        name: data.name,
        type: data.type,
        grade: data.grade ?? null,
        parentId: null,
        subjectId: null,
        subject: null,
        _count: { studentGroups: 0 },
        subGroups: [],
      };

      startTransition(() => {
        dispatchOptimistic({ type: "add", group: optimisticGroup });
      });

      const response = await createGroupAction(data);
      if (response.error) {
        router.refresh();
        toast.error(response.error);
        return false;
      }

      router.refresh();
      toast.success(`Группа "${data.name}" создана`);
      return true;
    },
    [dispatchOptimistic, router]
  );

  const handleRenameGroup = useCallback(
    async (id: string, name: string) => {
      const nextName = name.trim();
      if (!nextName) return;

      startTransition(() => {
        dispatchOptimistic({ type: "rename", id, name: nextName });
      });

      const response = await updateGroupAction(id, { name: nextName });
      if (response.error) {
        router.refresh();
        toast.error(response.error);
        return;
      }

      router.refresh();
      toast.success("Группа переименована");
    },
    [dispatchOptimistic, router]
  );

  const handleDeleteGroup = useCallback(
    async (group: GroupWithDetails) => {
      startTransition(() => {
        dispatchOptimistic({ type: "remove", id: group.id });
      });

      const response = await deleteGroupAction(group.id);
      if (response.error) {
        router.refresh();
        toast.error(response.error);
        return;
      }

      router.refresh();
      toast.success(`Группа "${group.name}" удалена`);
    },
    [dispatchOptimistic, router]
  );

  const handleTransferSave = useCallback(
    async (
      transferGroup: GroupWithDetails,
      toAssign: string[],
      toRemove: string[]
    ) => {
      if (toAssign.length === 0 && toRemove.length === 0) {
        return;
      }

      startTransition(() => {
        dispatchOptimistic({
          type: "studentsDelta",
          id: transferGroup.id,
          delta: toAssign.length - toRemove.length,
        });
      });

      if (toAssign.length > 0) {
        const assignResponse = await assignStudentsToGroupAction(transferGroup.id, toAssign);
        if (assignResponse.error) {
          router.refresh();
          toast.error(assignResponse.error);
          return;
        }
      }

      if (toRemove.length > 0) {
        const removeResponse = await removeStudentsFromGroupAction(transferGroup.id, toRemove);
        if (removeResponse.error) {
          router.refresh();
          toast.error(removeResponse.error);
          return;
        }
      }

      router.refresh();
      toast.success("Состав группы обновлен");
    },
    [dispatchOptimistic, router]
  );

  const loadStudentsForAssignment = useCallback(
    async (groupId: string, groupType: GroupType) => {
      const response = await getStudentsForAssignment(groupId, groupType);
      if (response.error) {
        toast.error(response.error);
        return null;
      }
      return response.result;
    },
    []
  );

  const loadGroupStudents = useCallback(async (groupId: string) => {
    const response = await getGroupStudents(groupId);
    if (response.error) {
      toast.error(response.error);
      return null;
    }
    return response.result;
  }, []);

  const handleSplitterSave = useCallback(
    async (data: {
      parentGroupId: string;
      subjectId: string;
      subgroups: { name: string; studentIds: string[] }[];
    }) => {
      const response = await createSubgroupsFromSplit(data);
      if (response.error) {
        toast.error(response.error);
        return false;
      }

      router.refresh();
      toast.success("Подгруппы созданы");
      return true;
    },
    [router]
  );

  const loadSubgroupEditorData = useCallback(async (subgroupId: string) => {
    const response = await getSubgroupEditorData(subgroupId);
    if (response.error) {
      toast.error(response.error);
      return null;
    }
    return response.result;
  }, []);

  const handleSubgroupRedistributionSave = useCallback(
    async (assignments: Record<string, string[]>) => {
      const response = await saveSubgroupRedistribution(assignments);
      if (response.error) {
        toast.error(response.error);
        return false;
      }

      router.refresh();
      toast.success("Состав подгрупп обновлен");
      return true;
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
    loadSubgroupEditorData,
    handleSubgroupRedistributionSave,
  };
}
