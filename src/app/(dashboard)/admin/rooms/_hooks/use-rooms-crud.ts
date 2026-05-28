"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { assertActionSuccess, type MutationCommand, withExecute } from "@/lib/mutation-utils";
import {
  createBuildingAction,
  createRoomAction,
  deleteRoomAction,
  updateRoomAction,
  updateRoomSubjectsAction,
} from "../_actions/room-actions";
import type { CreateBuildingInput, CreateRoomInput, UpdateRoomInput } from "../_lib/schemas";
import type { BuildingWithRooms, RoomListItem } from "../_lib/types";

type RoomEntity = {
  id: string;
  name: string;
  seatsCount: number;
  buildingId: string | null;
};

type UpdateRoomSubjectsVariables = {
  roomId: string;
  subjectIds: string[];
};

export type RoomsCrudCommands = {
  createBuilding: MutationCommand<CreateBuildingInput, BuildingWithRooms>;
  createRoom: MutationCommand<CreateRoomInput, RoomEntity>;
  updateRoom: MutationCommand<UpdateRoomInput, RoomEntity>;
  deleteRoom: MutationCommand<RoomListItem>;
  updateRoomSubjects: MutationCommand<UpdateRoomSubjectsVariables>;
};

export function useRoomsCrud(): RoomsCrudCommands {
  const createBuildingMutation = useMutation<
    BuildingWithRooms,
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
    onError: (error) => toast.error(error.message),
    onSuccess: (building) => toast.success(`Здание "${building.name}" успешно добавлено`),
  });

  const createRoomMutation = useMutation<RoomEntity, Error, CreateRoomInput>({
    mutationFn: async (input) => {
      return assertActionSuccess(
        await createRoomAction(input),
        "Не удалось создать кабинет"
      );
    },
    onError: (error) => toast.error(error.message),
    onSuccess: (room) => toast.success(`Кабинет "${room.name}" добавлен`),
  });

  const updateRoomMutation = useMutation<RoomEntity, Error, UpdateRoomInput>({
    mutationFn: async (input) => {
      return assertActionSuccess(
        await updateRoomAction(input),
        "Не удалось обновить кабинет"
      );
    },
    onError: (error) => toast.error(error.message),
    onSuccess: () => toast.success("Кабинет обновлен"),
  });

  const deleteRoomMutation = useMutation<unknown, Error, RoomListItem>({
    mutationFn: async (room) =>
      assertActionSuccess(
        await deleteRoomAction(room.id),
        "Не удалось удалить кабинет"
      ),
    onError: (error) => toast.error(error.message),
    onSuccess: (_result, room) => toast.success(`Кабинет "${room.name}" удален`),
  });

  const updateRoomSubjectsMutation = useMutation<
    unknown,
    Error,
    UpdateRoomSubjectsVariables
  >({
    mutationFn: async ({ roomId, subjectIds }) =>
      assertActionSuccess(
        await updateRoomSubjectsAction(roomId, subjectIds),
        "Не удалось обновить предметы кабинета"
      ),
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Предметы кабинета обновлены");
    },
  });

  return {
    createBuilding: withExecute(createBuildingMutation),
    createRoom: withExecute(createRoomMutation),
    updateRoom: withExecute(updateRoomMutation),
    deleteRoom: withExecute(deleteRoomMutation),
    updateRoomSubjects: withExecute(updateRoomSubjectsMutation),
  } as RoomsCrudCommands;
}
