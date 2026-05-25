"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type { GroupType } from "@/generated/prisma/client";
import type { GroupWithDetails, StudentForAssignment } from "../_lib/types";
import {
  createGroupAction,
  createSubgroupsFromSplit,
  deleteGroupAction,
  getGroupStudents,
  getSubgroupEditorData,
  getStudentsForAssignment,
  saveSubgroupRedistribution,
  type SubgroupEditorData,
  updateGroupAction,
  updateGroupStudentsAction,
} from "../_actions/group-actions";
import { toast } from "sonner";
import type { Result } from "@/lib/result";

type MutationContext = {
  previousGroups: GroupWithDetails[];
};

type GroupsCrudState = {
  groups: GroupWithDetails[];
  commands: GroupsCrudCommands;
  loadStudentsForAssignment: (
    groupId: string,
    groupType: GroupType
  ) => Promise<{
    assigned: StudentForAssignment[];
    available: StudentForAssignment[];
  } | null>;
  loadGroupStudents: (groupId: string) => Promise<StudentForAssignment[] | null>;
  loadSubgroupEditorData: (
    subgroupId: string
  ) => Promise<SubgroupEditorData | null>;
};

export type CreateGroupVariables = {
  name: string;
  type: GroupType;
  grade?: number | null;
};

export type RenameGroupVariables = {
  id: string;
  name: string;
};

export type TransferStudentsVariables = {
  group: GroupWithDetails;
  toAssign: string[];
  toRemove: string[];
};

export type SplitGroupVariables = {
  parentGroupId: string;
  subjectId: string;
  subgroups: { name: string; studentIds: string[] }[];
};

export type RedistributeSubgroupsVariables = Record<string, string[]>;

type MutationCommand<TVariables, TContext = unknown> = Pick<
  UseMutationResult<unknown, Error, TVariables, TContext>,
  "error" | "isPending" | "mutate" | "mutateAsync" | "reset" | "status" | "variables"
>;

export type GroupsCrudCommands = {
  createGroup: MutationCommand<CreateGroupVariables, MutationContext>;
  renameGroup: MutationCommand<RenameGroupVariables, MutationContext>;
  deleteGroup: MutationCommand<GroupWithDetails, MutationContext>;
  transferStudents: MutationCommand<TransferStudentsVariables, MutationContext>;
  splitGroup: MutationCommand<SplitGroupVariables>;
  redistributeSubgroups: MutationCommand<RedistributeSubgroupsVariables>;
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

function assertActionSuccess<T>(
  response: Result<T>,
  fallback: string
): T {
  if (response.error || response.result === null) {
    throw new Error(response.error ?? fallback);
  }

  return response.result;
}

export function useGroupsCrud(initialGroups: GroupWithDetails[]): GroupsCrudState {
  const router = useRouter();
  const [groupsState, setGroupsState] = useState({
    source: initialGroups,
    groups: initialGroups,
  });
  const groupsRef = useRef(initialGroups);

  if (groupsState.source !== initialGroups) {
    setGroupsState({ source: initialGroups, groups: initialGroups });
  }

  const groups =
    groupsState.source === initialGroups ? groupsState.groups : initialGroups;

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  const updateGroups = useCallback(
    (updater: (current: GroupWithDetails[]) => GroupWithDetails[]) => {
      setGroupsState((current) => {
        const next = updater(current.groups);
        groupsRef.current = next;
        return { source: current.source, groups: next };
      });
    },
    []
  );

  const restoreGroups = useCallback((previousGroups: GroupWithDetails[]) => {
    groupsRef.current = previousGroups;
    setGroupsState((current) => ({
      source: current.source,
      groups: previousGroups,
    }));
  }, []);

  const refreshServerState = useCallback(() => router.refresh(), [router]);

  const createGroupMutation = useMutation<
    unknown,
    Error,
    CreateGroupVariables,
    MutationContext
  >({
    mutationFn: async (data) => {
      const response = await createGroupAction(data);
      return assertActionSuccess(response, "Не удалось создать группу");
    },
    onMutate: (data) => {
      const previousGroups = groupsRef.current;
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

      updateGroups((current) => [optimisticGroup, ...current]);
      return { previousGroups };
    },
    onError: (error, _data, context) => {
      if (context) {
        restoreGroups(context.previousGroups);
      }

      toast.error(error.message);
    },
    onSuccess: (_result, data) => {
      toast.success(`Группа "${data.name}" создана`);
    },
    onSettled: refreshServerState,
  });

  const renameGroupMutation = useMutation<
    unknown,
    Error,
    RenameGroupVariables,
    MutationContext
  >({
    mutationFn: async ({ id, name }) => {
      const response = await updateGroupAction(id, { name });
      return assertActionSuccess(response, "Не удалось переименовать группу");
    },
    onMutate: ({ id, name }) => {
      const previousGroups = groupsRef.current;
      updateGroups((current) => applyRename(current, id, name));
      return { previousGroups };
    },
    onError: (error, _data, context) => {
      if (context) {
        restoreGroups(context.previousGroups);
      }

      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Группа переименована");
    },
    onSettled: refreshServerState,
  });

  const deleteGroupMutation = useMutation<
    unknown,
    Error,
    GroupWithDetails,
    MutationContext
  >({
    mutationFn: async (group) => {
      const response = await deleteGroupAction(group.id);
      return assertActionSuccess(response, "Не удалось удалить группу");
    },
    onMutate: (group) => {
      const previousGroups = groupsRef.current;
      updateGroups((current) => applyRemove(current, group.id));
      return { previousGroups };
    },
    onError: (error, _group, context) => {
      if (context) {
        restoreGroups(context.previousGroups);
      }

      toast.error(error.message);
    },
    onSuccess: (_result, group) => {
      toast.success(`Группа "${group.name}" удалена`);
    },
    onSettled: refreshServerState,
  });

  const transferStudentsMutation = useMutation<
    unknown,
    Error,
    TransferStudentsVariables,
    MutationContext
  >({
    mutationFn: async ({ group, toAssign, toRemove }) => {
      const response = await updateGroupStudentsAction({
        groupId: group.id,
        assignStudentIds: toAssign,
        removeStudentIds: toRemove,
      });

      return assertActionSuccess(response, "Не удалось обновить состав группы");
    },
    onMutate: ({ group, toAssign, toRemove }) => {
      const previousGroups = groupsRef.current;
      updateGroups((current) =>
        applyStudentsDelta(current, group.id, toAssign.length - toRemove.length)
      );
      return { previousGroups };
    },
    onError: (error, _data, context) => {
      if (context) {
        restoreGroups(context.previousGroups);
      }

      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Состав группы обновлен");
    },
    onSettled: refreshServerState,
  });

  const splitterMutation = useMutation<
    unknown,
    Error,
    SplitGroupVariables
  >({
    mutationFn: async (data) => {
      const response = await createSubgroupsFromSplit(data);
      return assertActionSuccess(response, "Не удалось создать подгруппы");
    },
    onError: (error) => toast.error(error.message),
    onSuccess: () => toast.success("Подгруппы созданы"),
    onSettled: refreshServerState,
  });

  const subgroupRedistributionMutation = useMutation<
    unknown,
    Error,
    RedistributeSubgroupsVariables
  >({
    mutationFn: async (assignments) => {
      const response = await saveSubgroupRedistribution(assignments);
      return assertActionSuccess(response, "Не удалось обновить подгруппы");
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Состав подгрупп обновлен");
    },
    onSettled: refreshServerState,
  });

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
  const loadSubgroupEditorData = useCallback(
    async (subgroupId: string) => {
      const response = await getSubgroupEditorData(subgroupId);
      if (response.error) {
        toast.error(response.error);
        return null;
      }
      return response.result;
    },
    []
  );

  const commands: GroupsCrudCommands = {
    createGroup: createGroupMutation,
    renameGroup: renameGroupMutation,
    deleteGroup: deleteGroupMutation,
    transferStudents: transferStudentsMutation,
    splitGroup: splitterMutation,
    redistributeSubgroups: subgroupRedistributionMutation,
  };

  return {
    groups,
    commands,
    loadStudentsForAssignment,
    loadGroupStudents,
    loadSubgroupEditorData,
  };
}
