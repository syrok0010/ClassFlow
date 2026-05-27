"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { Result } from "@/lib/result";
import {
  createBuildingAction,
  createRoomAction,
  deleteRoomAction,
  updateRoomAction,
  updateRoomSubjectsAction,
} from "../_actions/room-actions";
import type {
  CreateBuildingInput,
  CreateRoomInput,
  UpdateRoomInput,
} from "../_lib/schemas";
import type {
  BuildingWithRooms,
  RoomListItem,
  SubjectLite,
} from "../_lib/types";

type RoomMutationCommand<TVariables, TData = unknown> = Pick<
  UseMutationResult<TData, Error, TVariables>,
  "error" | "isPending" | "mutate" | "mutateAsync" | "reset" | "status" | "variables"
> & {
  execute: (variables: TVariables) => Promise<TData | null>;
};

type BuildingEntity = BuildingWithRooms;
type RoomEntity = BuildingWithRooms["rooms"][number];

type UpdateRoomSubjectsVariables = {
  roomId: string;
  subjectIds: string[];
};

export type RoomsCrudCommands = {
  createBuilding: RoomMutationCommand<CreateBuildingInput, BuildingEntity>;
  createRoom: RoomMutationCommand<CreateRoomInput, RoomEntity>;
  updateRoom: RoomMutationCommand<UpdateRoomInput, RoomEntity>;
  deleteRoom: RoomMutationCommand<RoomListItem>;
  updateRoomSubjects: RoomMutationCommand<UpdateRoomSubjectsVariables>;
};

type RoomsCrudState = {
  buildings: BuildingWithRooms[];
  subjects: SubjectLite[];
  commands: RoomsCrudCommands;
};

function assertActionSuccess<T>(response: Result<T>, fallback: string): T {
  if (response.error || response.result === null) {
    throw new Error(response.error ?? fallback);
  }

  return response.result;
}

function withExecute<TVariables, TData>(
  mutation: UseMutationResult<TData, Error, TVariables>
): RoomMutationCommand<TVariables, TData> {
  return {
    error: mutation.error,
    isPending: mutation.isPending,
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    reset: mutation.reset,
    status: mutation.status,
    variables: mutation.variables,
    execute: async (variables) => {
      try {
        return await mutation.mutateAsync(variables);
      } catch {
        return null;
      }
    },
  };
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name, "ru"));
}

function createRoomEntity(
  data: {
    id: string;
    name: string;
    seatsCount: number;
    buildingId: string | null;
  },
  subjectIds: string[],
  subjects: SubjectLite[]
): RoomEntity {
  return {
    ...data,
    roomSubjects: subjectIds
      .map((subjectId) => {
        const subject = subjects.find((item) => item.id === subjectId);
        if (!subject) {
          return null;
        }

        return {
          roomId: data.id,
          subjectId,
          subject,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
  };
}

export function useRoomsCrud(
  initialBuildings: BuildingWithRooms[],
  initialSubjects: SubjectLite[]
): RoomsCrudState {
  const router = useRouter();
  const [roomsState, setRoomsState] = useState({
    buildingsSource: initialBuildings,
    subjectsSource: initialSubjects,
    buildings: initialBuildings,
    subjects: initialSubjects,
  });

  if (
    roomsState.buildingsSource !== initialBuildings ||
    roomsState.subjectsSource !== initialSubjects
  ) {
    setRoomsState({
      buildingsSource: initialBuildings,
      subjectsSource: initialSubjects,
      buildings: initialBuildings,
      subjects: initialSubjects,
    });
  }

  const buildings =
    roomsState.buildingsSource === initialBuildings
      ? roomsState.buildings
      : initialBuildings;
  const subjects =
    roomsState.subjectsSource === initialSubjects
      ? roomsState.subjects
      : initialSubjects;

  const updateBuildings = useCallback(
    (updater: (current: BuildingWithRooms[]) => BuildingWithRooms[]) => {
      setRoomsState((current) => ({
        ...current,
        buildings: updater(current.buildings),
      }));
    },
    []
  );

  const refreshServerState = useCallback(() => router.refresh(), [router]);

  const createBuildingMutation = useMutation<
    BuildingEntity,
    Error,
    CreateBuildingInput
  >({
    mutationFn: async (input) => {
      const building = assertActionSuccess(
        await createBuildingAction(input),
        "Не удалось создать здание"
      );

      return {
        ...building,
        rooms: [],
      };
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (building) => {
      updateBuildings((current) => sortByName([...current, building]));
      toast.success(`Здание "${building.name}" успешно добавлено`);
    },
    onSettled: refreshServerState,
  });

  const createRoomMutation = useMutation<RoomEntity, Error, CreateRoomInput>({
    mutationFn: async (input) => {
      const room = assertActionSuccess(
        await createRoomAction(input),
        "Не удалось создать кабинет"
      );

      return createRoomEntity(room, [], subjects);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (room) => {
      updateBuildings((current) =>
        current.map((building) =>
          building.id === room.buildingId
            ? {
                ...building,
                rooms: sortByName([...building.rooms, room]),
              }
            : building
        )
      );

      toast.success(`Кабинет "${room.name}" добавлен`);
    },
    onSettled: refreshServerState,
  });

  const updateRoomMutation = useMutation<RoomEntity, Error, UpdateRoomInput>({
    mutationFn: async (input) => {
      const room = assertActionSuccess(
        await updateRoomAction(input),
        "Не удалось обновить кабинет"
      );

      return createRoomEntity(room, [], subjects);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (room) => {
      updateBuildings((current) =>
        current.map((building) => ({
          ...building,
          rooms: sortByName(
            building.rooms.map((item) =>
              item.id === room.id
                ? {
                    ...item,
                    name: room.name,
                    seatsCount: room.seatsCount,
                  }
                : item
            )
          ),
        }))
      );

      toast.success("Кабинет обновлен");
    },
    onSettled: refreshServerState,
  });

  const deleteRoomMutation = useMutation<unknown, Error, RoomListItem>({
    mutationFn: async (room) =>
      assertActionSuccess(
        await deleteRoomAction(room.id),
        "Не удалось удалить кабинет"
      ),
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (_result, room) => {
      updateBuildings((current) =>
        current.map((building) => ({
          ...building,
          rooms: building.rooms.filter((item) => item.id !== room.id),
        }))
      );

      toast.success(`Кабинет "${room.name}" удален`);
    },
    onSettled: refreshServerState,
  });

  const updateRoomSubjectsMutation = useMutation<
    unknown,
    Error,
    UpdateRoomSubjectsVariables,
    { previousBuildings: BuildingWithRooms[] }
  >({
    mutationFn: async ({ roomId, subjectIds }) =>
      assertActionSuccess(
        await updateRoomSubjectsAction(roomId, subjectIds),
        "Не удалось обновить предметы кабинета"
      ),
    onMutate: ({ roomId, subjectIds }) => {
      const previousBuildings = buildings;

      updateBuildings((current) =>
        current.map((building) => ({
          ...building,
          rooms: building.rooms.map((room) =>
            room.id === roomId
              ? createRoomEntity(room, subjectIds, subjects)
              : room
          ),
        }))
      );

      return { previousBuildings };
    },
    onError: (error, _variables, context) => {
      if (context?.previousBuildings) {
        setRoomsState((current) => ({
          ...current,
          buildings: context.previousBuildings,
        }));
      }

      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Предметы кабинета обновлены");
    },
    onSettled: refreshServerState,
  });

  const commands: RoomsCrudCommands = {
    createBuilding: withExecute(createBuildingMutation),
    createRoom: withExecute(createRoomMutation),
    updateRoom: withExecute(updateRoomMutation),
    deleteRoom: withExecute(deleteRoomMutation),
    updateRoomSubjects: withExecute(updateRoomSubjectsMutation),
  };

  return {
    buildings,
    subjects,
    commands,
  };
}
