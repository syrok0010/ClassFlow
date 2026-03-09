"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { deleteUserAction } from "../_actions/user-actions";
import type { UserWithRoles } from "../_lib/types";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles;
}

export function DeleteUserDialog({ open, onOpenChange, user }: DeleteUserDialogProps) {
  const [confirmValue, setConfirmValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fullName = [user.surname, user.name].filter(Boolean).join(" ");

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteUserAction(user.id, confirmValue);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Пользователь удалён");
        onOpenChange(false);
      }
    } catch {
      toast.error("Ошибка при удалении");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmValue("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Удаление пользователя</DialogTitle>
          <DialogDescription>
            Вы уверены? Будут удалены все связи (оценки, расписание). Это действие необратимо.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm">
            Для подтверждения введите имя пользователя:{" "}
            <span className="font-semibold text-foreground">{fullName}</span>
          </p>
          <Input
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            placeholder={fullName}
            className="border-destructive/50 focus-visible:ring-destructive/30"
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmValue !== fullName || isDeleting}
          >
            {isDeleting ? "Удаление..." : "Удалить навсегда"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
