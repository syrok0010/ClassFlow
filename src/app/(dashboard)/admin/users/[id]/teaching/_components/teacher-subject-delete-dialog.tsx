"use client";

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
import type { TeacherSubjectRow } from "../_lib/types";

interface TeacherSubjectDeleteDialogProps {
  row: TeacherSubjectRow;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function TeacherSubjectDeleteDialog({
  row,
  isDeleting,
  onOpenChange,
  onConfirm,
}: TeacherSubjectDeleteDialogProps) {
  return (
    <AlertDialog open={true} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить связь преподавателя с предметом «{row.subjectName}»?</AlertDialogTitle>
          <AlertDialogDescription>
            Это действие используется и для исправления неверно выбранного предмета: удалите связь и создайте новую с правильным предметом.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
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
