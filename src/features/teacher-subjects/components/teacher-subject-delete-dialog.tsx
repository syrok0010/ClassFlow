"use client";

import { useState } from "react";
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
import type { TeacherSubjectRow } from "../lib/types";

interface TeacherSubjectDeleteDialogProps {
  row: TeacherSubjectRow;
  onOpenChange: (open: boolean) => void;
  onConfirm: (row: TeacherSubjectRow) => Promise<boolean>;
}

export function TeacherSubjectDeleteDialog({
  row,
  onOpenChange,
  onConfirm,
}: TeacherSubjectDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (isDeleting) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await onConfirm(row);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={true} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Удалить связь преподавателя с предметом «{row.subjectName}»?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Это действие используется и для исправления неверно выбранного предмета: удалите связь и
            создайте новую с правильным предметом.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={handleConfirm}
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
