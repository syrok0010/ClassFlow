"use client";

import { useState } from "react";
import { Ellipsis, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RoomListItem } from "../_lib/types";
import { deleteRoomAction } from "../_actions/room-actions";

type RoomActionsMenuProps = {
  room: RoomListItem;
  onEdit: () => void;
  onDelete: () => void;
};

export function RoomActionsMenu({ room, onEdit, onDelete }: RoomActionsMenuProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteRoomAction(room.id);
    setIsDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(`Кабинет '${room.name}' удален`);
    onDelete();
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
