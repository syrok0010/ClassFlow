import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { AvailabilityOverridesList } from "@/features/availability/components/availability-overrides-list";
import { OverrideEntryFormDialog } from "@/features/availability/components/override-entry-form-dialog";
import type {
  CreateTeacherAvailabilityOverrideInput,
  UpdateTeacherAvailabilityOverrideInput,
} from "@/features/availability/lib/schemas";
import type { AvailabilityOverrideEntry, AvailabilityTeacher } from "@/features/availability/lib/types";

export type OverrideDialogState = {
  open: boolean;
  entry: AvailabilityOverrideEntry | null;
  draftDate?: Date;
  draftStartTime?: number;
  draftEndTime?: number;
};

export function TeacherAvailabilityOverridesPanel({
  teacher,
  weekStart,
  dialog,
  selectedOverrideId,
  overrideToDelete,
  isSaving,
  onOpenCreate,
  onOpenEdit,
  onSelectOverride,
  onRequestDelete,
  onDialogChange,
  onDeleteDialogChange,
  onCreate,
  onUpdate,
  onDelete,
}: {
  teacher: AvailabilityTeacher;
  weekStart: Date;
  dialog: OverrideDialogState;
  selectedOverrideId: string | null;
  overrideToDelete: AvailabilityOverrideEntry | null;
  isSaving: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (entry: AvailabilityOverrideEntry) => void;
  onSelectOverride: (overrideId: string | null) => void;
  onRequestDelete: (entry: AvailabilityOverrideEntry | null) => void;
  onDialogChange: (open: boolean) => void;
  onDeleteDialogChange: (open: boolean) => void;
  onCreate: (payload: CreateTeacherAvailabilityOverrideInput) => Promise<boolean>;
  onUpdate: (payload: UpdateTeacherAvailabilityOverrideInput) => Promise<boolean>;
  onDelete: () => void;
}) {
  return (
    <>
      <Card className="h-full">
        <CardHeader className="border-b">
          <CardTitle>Исключения</CardTitle>
          <CardDescription>
            Разовые изменения поверх шаблона.
          </CardDescription>
          <CardAction>
            <Button variant="default" size="xs" disabled={isSaving} onClick={onOpenCreate}>
              <Plus data-icon="inline-start" />
              Добавить исключение
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <AvailabilityOverridesList
            teacher={teacher}
            weekStart={weekStart}
            isSaving={isSaving}
            selectedOverrideId={selectedOverrideId}
            currentWeekSummary={(count) =>
              `На текущей неделе активно ${count} ${
                count === 1 ? "исключение" : "исключения"
              }.`
            }
            emptyTitle="У вас нет разовых исключений"
            emptyDescription="Добавляйте исключения для больничных, отпусков, переносов и дополнительных окон."
            editButtonTestId="teacher-override-edit"
            deleteButtonTestId="teacher-override-delete"
            onOpenEdit={onOpenEdit}
            onDelete={(entry) => onRequestDelete(entry)}
            onSelectOverride={onSelectOverride}
          />
        </CardContent>
      </Card>

      <OverrideEntryFormDialog
        open={dialog.open}
        teacherId={teacher.teacherId}
        teacherName={teacher.fullName}
        entry={dialog.entry}
        initialValues={{
          date: dialog.draftDate,
          startTime: dialog.draftStartTime,
          endTime: dialog.draftEndTime,
        }}
        isSaving={isSaving}
        onOpenChange={onDialogChange}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />

      <AlertDialog open={Boolean(overrideToDelete)} onOpenChange={onDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить исключение?</AlertDialogTitle>
            <AlertDialogDescription>
              Исключение будет убрано из превью недели и из будущих расчётов расписания.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
