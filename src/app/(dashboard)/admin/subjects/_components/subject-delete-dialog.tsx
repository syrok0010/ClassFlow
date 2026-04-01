"use client";

import { useEffect, useState } from "react";
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
import type { SubjectDeleteGuards, SubjectWithUsage } from "../_lib/types";

interface SubjectDeleteDialogProps {
  subject: SubjectWithUsage;
  isDeleting: boolean;
  loadDeleteGuards: (id: string) => Promise<SubjectDeleteGuards | null>;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

function hasDependencies(guards: SubjectDeleteGuards | null): boolean {
  if (!guards) {
    return false;
  }

  return (
    guards.roomsCount > 0 ||
    guards.requirementsCount > 0 ||
    guards.teachersCount > 0 ||
    guards.scheduleTemplatesCount > 0 ||
    guards.scheduleEntriesCount > 0
  );
}

export function SubjectDeleteDialog({
  subject,
  isDeleting,
  loadDeleteGuards,
  onOpenChange,
  onConfirm,
}: SubjectDeleteDialogProps) {
  const [guards, setGuards] = useState<SubjectDeleteGuards | null>(null);
  const [isLoadingGuards, setIsLoadingGuards] = useState(false);

  useEffect(() => {
    setGuards(null);
    setIsLoadingGuards(false);

    let active = true;

    const loadGuards = async () => {
      setIsLoadingGuards(true);

      try {
        const nextGuards = await loadDeleteGuards(subject.id);
        if (!active) {
          return;
        }

        setGuards(nextGuards ?? subject.usage);
      } finally {
        if (active) {
          setIsLoadingGuards(false);
        }
      }
    };

    void loadGuards();

    return () => {
      active = false;
    };
  }, [loadDeleteGuards, subject]);

  const blocked = hasDependencies(guards);
  const disableDelete = isLoadingGuards || blocked || isDeleting;

  return (
    <AlertDialog open={true} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isLoadingGuards
              ? `Проверяем связи предмета \"${subject.name}\"`
              : blocked
              ? `Невозможно удалить предмет \"${subject.name}\"`
              : `Удалить предмет \"${subject.name}\"?`}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-1">
            {isLoadingGuards ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Проверяем, где используется предмет...
              </span>
            ) : blocked ? (
              <>
                <span className="block">Невозможно удалить предмет, пока он используется в других разделах системы.</span>
                {guards && guards.roomsCount > 0 ? (
                  <span className="block">Используется в {guards.roomsCount} кабинетах</span>
                ) : null}
                {guards && guards.requirementsCount > 0 ? (
                  <span className="block">
                    Используется в {guards.requirementsCount} требованиях учебного плана
                  </span>
                ) : null}
                {guards && guards.teachersCount > 0 ? (
                  <span className="block">Назначен {guards.teachersCount} преподавателям</span>
                ) : null}
                {guards && guards.scheduleTemplatesCount > 0 ? (
                  <span className="block">
                    Используется в {guards.scheduleTemplatesCount} шаблонах расписания
                  </span>
                ) : null}
                {guards && guards.scheduleEntriesCount > 0 ? (
                  <span className="block">Используется в {guards.scheduleEntriesCount} записях расписания</span>
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
            onClick={() => {
              void onConfirm();
            }}
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
