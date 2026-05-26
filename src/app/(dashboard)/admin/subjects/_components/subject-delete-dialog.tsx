"use client";

import { useQuery } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";
import type { SubjectsCrudCommands } from "../_hooks/use-subjects-crud";
import { getSubjectDeleteGuardsAction } from "../_actions/subject-actions";
import { hasSubjectDependencies } from "../_lib/subject-usage";
import type { SubjectWithUsage } from "../_lib/types";

interface SubjectDeleteDialogProps {
  subject: SubjectWithUsage;
  command: SubjectsCrudCommands["deleteSubject"];
  onOpenChange: (open: boolean) => void;
}

export function SubjectDeleteDialog({
  subject,
  command,
  onOpenChange,
}: SubjectDeleteDialogProps) {
  const usageQuery = useQuery({
    queryKey: ["subject-usage", subject.id],
    queryFn: async () => {
      const response = await getSubjectDeleteGuardsAction(subject.id);
      if (response.error || !response.result) {
        toast.error(response.error);
        throw new Error(response.error ?? "Не удалось проверить связи предмета");
      }

      return response.result;
    },
    retry: false,
  });

  const usage = usageQuery.data ?? subject.usage;
  const isDeleting = command.isPending;
  const blocked = hasSubjectDependencies(usage);
  const disableDelete = usageQuery.isPending || blocked || isDeleting;

  const handleConfirm = async () => {
    try {
      await command.mutateAsync(subject);
      onOpenChange(false);
    } catch {
      // Toast is shown by the mutation.
    }
  };

  return (
    <AlertDialog open={true} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {usageQuery.isPending
              ? `Проверяем связи предмета \"${subject.name}\"`
              : blocked
              ? `Невозможно удалить предмет \"${subject.name}\"`
              : `Удалить предмет \"${subject.name}\"?`}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-1">
            {usageQuery.isPending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Проверяем, где используется предмет...
              </span>
            ) : blocked ? (
              <>
                <span className="block">Невозможно удалить предмет, пока он используется в других разделах системы.</span>
                {usage.roomsCount > 0 ? (
                  <span className="block">Используется в {usage.roomsCount} кабинетах</span>
                ) : null}
                {usage.requirementsCount > 0 ? (
                  <span className="block">
                    Используется в {usage.requirementsCount} требованиях учебного плана
                  </span>
                ) : null}
                {usage.teachersCount > 0 ? (
                  <span className="block">Назначен {usage.teachersCount} преподавателям</span>
                ) : null}
                {usage.scheduleTemplatesCount > 0 ? (
                  <span className="block">
                    Используется в {usage.scheduleTemplatesCount} шаблонах расписания
                  </span>
                ) : null}
                {usage.scheduleEntriesCount > 0 ? (
                  <span className="block">Используется в {usage.scheduleEntriesCount} записях расписания</span>
                ) : null}
              </>
            ) : (
              <span className="block">Это действие нельзя отменить.</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={disableDelete}
            onClick={(event) => {
              event.preventDefault();
              void handleConfirm();
            }}
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
