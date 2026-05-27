"use client";

import { Ellipsis, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RoomListItem } from "../_lib/types";
import { useRoomsData } from "./rooms-data-context";

type RoomActionsMenuProps = {
  room: RoomListItem;
  onEdit: () => void;
};

export function RoomActionsMenu({ room, onEdit }: RoomActionsMenuProps) {
  const { commands } = useRoomsData();
  const isDeleting =
    commands.deleteRoom.isPending &&
    commands.deleteRoom.variables?.id === room.id;

  const handleDelete = async () => {
    try {
      await commands.deleteRoom.mutateAsync(room);
    } catch {
      // Toast is shown by the mutation.
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <Ellipsis className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          Редактировать
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            void handleDelete();
          }}
          disabled={isDeleting}
          variant="destructive"
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? "Удаляем..." : "Удалить"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
