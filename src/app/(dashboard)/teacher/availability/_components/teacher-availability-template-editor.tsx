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
import { AvailabilityTemplateList } from "@/features/availability/components/availability-template-list";
import { TemplateEntryFormDialog } from "@/features/availability/components/template-entry-form-dialog";
import type { TeacherAvailabilityTemplateEditorInput } from "@/features/availability/lib/schemas";
import type {
  AvailabilityTemplateEntry,
  AvailabilityTeacher,
} from "@/features/availability/lib/types";

export type TemplateDialogState = {
  open: boolean;
  entry: AvailabilityTemplateEntry | null;
  draftDayOfWeek?: number;
  draftStartTime?: number;
  draftEndTime?: number;
};

export function TeacherAvailabilityTemplateEditor({
  teacher,
  dialog,
  isSaving,
  onOpenCreate,
  onOpenEdit,
  onDeleteEntry,
  onDialogChange,
  onSubmit,
}: {
  teacher: AvailabilityTeacher;
  dialog: TemplateDialogState;
  isSaving: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (entry: AvailabilityTemplateEntry) => void;
  onDeleteEntry: (entry: AvailabilityTemplateEntry) => void;
  onDialogChange: (open: boolean) => void;
  onSubmit: (entry: TeacherAvailabilityTemplateEditorInput, previousId?: string) => Promise<boolean>;
}) {
  return (
    <>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Шаблон недели</CardTitle>
          <CardDescription>
            Отмечайте, когда вы обычно можете работать каждую неделю.
          </CardDescription>
          <CardAction>
            <Button variant="default" size="sm" disabled={isSaving} onClick={onOpenCreate}>
              <Plus data-icon="inline-start" />
              Добавить интервал
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AvailabilityTemplateList
            teacher={teacher}
            isSaving={isSaving}
            emptyTitle="Вы ещё не указали регулярную доступность"
            emptyDescription="Начните с превью недели: добавьте обычные интервалы доступности."
            groupEmptyDescription="Для этого типа интервалы пока не заданы."
            editButtonTestId="teacher-template-edit"
            deleteButtonTestId="teacher-template-delete"
            onOpenEdit={onOpenEdit}
            onDeleteEntry={onDeleteEntry}
          />
        </CardContent>
      </Card>

      <TemplateEntryFormDialog
        open={dialog.open}
        teacherName={teacher.fullName}
        entry={dialog.entry}
        initialValues={{
          dayOfWeek: dialog.draftDayOfWeek,
          startTime: dialog.draftStartTime,
          endTime: dialog.draftEndTime,
        }}
        allowErase
        isSaving={isSaving}
        onOpenChange={onDialogChange}
        onSubmit={onSubmit}
      />
    </>
  );
}
