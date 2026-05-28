"use client";

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import type { GroupType } from "@/generated/prisma/client";
import { assertActionSuccess } from "@/lib/mutation-utils";
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

type MutationCommand<TVariables> = Pick<
  UseMutationResult<unknown, Error, TVariables>,
  "error" | "isPending" | "mutate" | "mutateAsync" | "reset" | "status" | "variables"
>;

export type GroupsCrudCommands = {
  createGroup: MutationCommand<CreateGroupVariables>;
  renameGroup: MutationCommand<RenameGroupVariables>;
  deleteGroup: MutationCommand<GroupWithDetails>;
  transferStudents: MutationCommand<TransferStudentsVariables>;
  splitGroup: MutationCommand<SplitGroupVariables>;
  redistributeSubgroups: MutationCommand<RedistributeSubgroupsVariables>;
};

export function useGroupsCrud(initialGroups: GroupWithDetails[]): GroupsCrudState {
  const createGroupMutation = useMutation<unknown, Error, CreateGroupVariables>({
    mutationFn: async (data) => {
      const response = await createGroupAction(data);
      return assertActionSuccess(response, "Не удалось создать группу");
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_result, data) => {
      toast.success(`Группа "${data.name}" создана`);
    },
  });

  const renameGroupMutation = useMutation<unknown, Error, RenameGroupVariables>({
    mutationFn: async ({ id, name }) => {
      const response = await updateGroupAction(id, { name });
      return assertActionSuccess(response, "Не удалось переименовать группу");
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Группа переименована");
    },
  });

  const deleteGroupMutation = useMutation<unknown, Error, GroupWithDetails>({
    mutationFn: async (group) => {
      const response = await deleteGroupAction(group.id);
      return assertActionSuccess(response, "Не удалось удалить группу");
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_result, group) => {
      toast.success(`Группа "${group.name}" удалена`);
    },
  });

  const transferStudentsMutation = useMutation<
    unknown,
    Error,
    TransferStudentsVariables
  >({
    mutationFn: async ({ group, toAssign, toRemove }) => {
      const response = await updateGroupStudentsAction({
        groupId: group.id,
        assignStudentIds: toAssign,
        removeStudentIds: toRemove,
      });

      return assertActionSuccess(response, "Не удалось обновить состав группы");
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Состав группы обновлен");
    },
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
    groups: initialGroups,
    commands,
    loadStudentsForAssignment,
    loadGroupStudents,
    loadSubgroupEditorData,
  };
}
