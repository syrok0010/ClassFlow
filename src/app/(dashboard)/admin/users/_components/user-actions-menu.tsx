"use client";

import { MoreHorizontal, Copy, UserPlus, Pencil, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { type Table } from "@tanstack/react-table";
import type { UserWithRoles, UserTableMeta } from "../_lib/types";
import {
  toggleUserStatusAction,
  getInviteTokenAction,
} from "../_actions/user-actions";

export function UserActionsMenu({ user, table }: { user: UserWithRoles; table: Table<UserWithRoles> }) {
  const meta = table.options.meta as UserTableMeta;

  const isStudent = user.students.length > 0;
  const isPending = user.status === "PENDING_INVITE";
  const isDisabled = user.status === "DISABLED";

  const handleCopyInvite = async () => {
    try {
      const result = await getInviteTokenAction(user.id);
      if (result.token) {
        const inviteUrl = `${window.location.origin}/invite/${result.token}`;
        await navigator.clipboard.writeText(inviteUrl);
        toast.success("Ссылка-инвайт скопирована");
      }
    } catch {
      toast.error("Не удалось получить инвайт");
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = isDisabled ? "ACTIVE" : "DISABLED";
    try {
      await toggleUserStatusAction(user.id, newStatus);
      toast.success(isDisabled ? "Доступ восстановлен" : "Доступ заблокирован");
    } catch {
      toast.error("Ошибка при изменении статуса");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center justify-center rounded-md h-8 w-8 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Действия</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => meta?.setModal({ type: "profile", user })}>
            <Pencil className="mr-2 h-4 w-4" />
            Редактировать профиль
          </DropdownMenuItem>

          {isPending && (
            <DropdownMenuItem onClick={handleCopyInvite}>
              <Copy className="mr-2 h-4 w-4" />
              Скопировать ссылку-инвайт
            </DropdownMenuItem>
          )}

          {isStudent && (
            <DropdownMenuItem onClick={() => meta?.setInviteId(user.students[0].id)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Сгенерировать инвайт для родителя
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleToggleStatus}>
            {isDisabled ? (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Восстановить доступ
              </>
            ) : (
              <>
                <ShieldOff className="mr-2 h-4 w-4" />
                Заблокировать доступ
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => meta?.setModal({ type: "delete", user })}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить пользователя
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
