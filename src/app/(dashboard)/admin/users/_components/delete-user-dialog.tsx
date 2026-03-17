"use client";

import { useForm } from "@tanstack/react-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteUserAction } from "../_actions/user-actions";
import { deleteUserSchema } from "../_lib/schemas";
import { FormField } from "@/components/ui/form-field";
import type { UserWithRoles } from "../_lib/types";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles;
}

export function DeleteUserDialog({ open, onOpenChange, user }: DeleteUserDialogProps) {
  const fullName = [user.surname, user.name].filter(Boolean).join(" ");

  const form = useForm({
    defaultValues: {
      id: user.id,
      confirmName: "",
    },
    validators: {
      onChange: deleteUserSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await deleteUserAction(value.id, value.confirmName);
        if ("error" in result) {
          toast.error(result.error);
        } else {
          toast.success("Пользователь удалён");
          onOpenChange(false);
        }
      } catch {
        toast.error("Ошибка при удалении");
      }
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive uppercase tracking-tight font-bold">Удаление пользователя</DialogTitle>
          <DialogDescription>
            Вы уверены? Будут удалены все связи (оценки, расписание). Это действие необратимо.
          </DialogDescription>
        </DialogHeader>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20 text-sm text-destructive font-medium">
            Для подтверждения введите имя пользователя: {fullName}
          </div>

          <form.Field name="confirmName">
            {(field) => (
              <FormField 
                field={field}
                placeholder={fullName}
                id="delete-confirm"
              />
            )}
          </form.Field>

          <DialogFooter className="pt-2">
            <Button variant="ghost" type="button" onClick={() => handleOpenChange(false)}>
              Отмена
            </Button>
            <form.Subscribe selector={(state) => ({ 
              canSubmit: state.canSubmit, 
              isSubmitting: state.isSubmitting, 
              confirmName: state.values.confirmName 
            })}>
              {({ canSubmit, isSubmitting, confirmName }) => (
                <Button
                  variant="destructive"
                  type="submit"
                  disabled={!canSubmit || isSubmitting || confirmName !== fullName}
                  className="font-semibold"
                >
                  {isSubmitting ? "Удаление..." : "Удалить навсегда"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
