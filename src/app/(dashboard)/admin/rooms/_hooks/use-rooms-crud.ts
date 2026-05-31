"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { assertActionSuccess, type MutationCommand, withExecute } from "@/lib/mutation-utils";
import {
  createBuildingAction,
  createRoomAction,
  deleteRoomAction,
  updateRoomAction,
} from "../_actions/room-actions";
import type { CreateBuildingInput, CreateRoomInput, UpdateRoomInput } from "../_lib/schemas";
import type { BuildingWithRooms, RoomListItem } from "../_lib/types";

type RoomEntity = {
  id: string;
  name: string;
  seatsCount: number;
  buildingId: string | null;
};

export type RoomsCrudCommands = {
  createBuilding: MutationCommand<CreateBuildingInput, BuildingWithRooms>;
  createRoom: MutationCommand<CreateRoomInput, RoomEntity>;
  updateRoom: MutationCommand<UpdateRoomInput, RoomEntity>;
  deleteRoom: MutationCommand<RoomListItem>;
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

  return {
    createBuilding: withExecute(createBuildingMutation),
    createRoom: withExecute(createRoomMutation),
    updateRoom: withExecute(updateRoomMutation),
    deleteRoom: withExecute(deleteRoomMutation),
  } as RoomsCrudCommands;
}
