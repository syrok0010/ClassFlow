"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { assertActionSuccess } from "@/lib/mutation-utils";
import { updateRoomSubjectsAction } from "../_actions/room-actions";

export function getRoomSubjectIdsQueryKey(roomId: string) {
  return ["rooms", "detail", roomId, "subjectIds"] as const;
}

type RoomSubjectIdsResponse = {
  subjectIds: string[];
};

async function fetchRoomSubjectIds(roomId: string) {
  const response = await fetch(`/api/admin/rooms/${roomId}/subjects`);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Не удалось загрузить предметы кабинета");
  }

  const body = (await response.json()) as RoomSubjectIdsResponse;
  return body.subjectIds;
}

export function useRoomSubjects(roomId: string, initialSelectedSubjectIds: string[]) {
  const queryClient = useQueryClient();
  const queryKey = getRoomSubjectIdsQueryKey(roomId);

  const subjectIdsQuery = useQuery({
    queryKey,
    queryFn: () => fetchRoomSubjectIds(roomId),
    initialData: initialSelectedSubjectIds,
  });

  const updateSubjectIdsMutation = useMutation<
    string[],
    Error,
    string[],
    { previousSubjectIds: string[] }
  >({
    mutationFn: async (nextSubjectIds) => {
      assertActionSuccess(
        await updateRoomSubjectsAction(roomId, nextSubjectIds),
        "Не удалось обновить предметы кабинета"
      );

      return nextSubjectIds;
    },
    onMutate: async (nextSubjectIds) => {
      await queryClient.cancelQueries({ queryKey });

      const previousSubjectIds =
        queryClient.getQueryData<string[]>(queryKey) ?? initialSelectedSubjectIds;

      queryClient.setQueryData(queryKey, nextSubjectIds);

      return { previousSubjectIds };
    },
    onError: (error, _nextSubjectIds, context) => {
      if (context) {
        queryClient.setQueryData(queryKey, context.previousSubjectIds);
      }

      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Предметы кабинета обновлены");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    selectedSubjectIds: subjectIdsQuery.data,
    isLoading: subjectIdsQuery.isLoading,
    isFetching: subjectIdsQuery.isFetching,
    isSaving: updateSubjectIdsMutation.isPending,
    updateSelectedSubjectIds: updateSubjectIdsMutation.mutateAsync,
  };
}
