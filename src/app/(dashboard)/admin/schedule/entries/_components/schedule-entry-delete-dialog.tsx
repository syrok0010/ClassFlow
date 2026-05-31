"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import type { AdminScheduleEvent } from "../../_lib/admin-schedule-types";
import { deleteAdminScheduleEntryAction } from "../_actions/schedule-entry-actions";

interface ScheduleEntryDeleteDialogProps {
  event: AdminScheduleEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleEntryDeleteDialog({
  event,
  open,
  onOpenChange,
}: ScheduleEntryDeleteDialogProps) {
  const router = useRouter();
  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await deleteAdminScheduleEntryAction(entryId);
      if (response.error) {
        throw new Error(response.error);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Запись фактического расписания удалена");
      onOpenChange(false);
      router.refresh();
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (deleteMutation.isPending) {
      return;
    }

    onOpenChange(nextOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить запись?</AlertDialogTitle>
          <AlertDialogDescription>
            Это действие удалит только выбранную запись фактического расписания.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            disabled={!event || deleteMutation.isPending}
            onClick={(dialogEvent) => {
              dialogEvent.preventDefault();

              if (event) {
                deleteMutation.mutate(event.id);
              }
            }}
          >
            <span className={cn("inline-flex items-center gap-1", deleteMutation.isPending && "opacity-90")}>
              {deleteMutation.isPending ? <Spinner /> : null}
              Удалить
            </span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
