"use client";

import { format } from "date-fns";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { OverrideEntryFormDialog } from "@/features/availability/components/override-entry-form-dialog";
import { TemplateEntryFormDialog } from "@/features/availability/components/template-entry-form-dialog";
import { AvailabilityWeekToolbar } from "@/features/availability/components/availability-week-toolbar";
import { useAvailabilityOverrideMutations } from "@/features/availability/hooks/use-availability-override-mutations";
import { useAvailabilityTemplateMutations } from "@/features/availability/hooks/use-availability-template-mutations";
import type {
  CreateTeacherAvailabilityOverrideInput,
  TeacherAvailabilityTemplateEditorInput,
  UpdateTeacherAvailabilityOverrideInput,
} from "@/features/availability/lib/schemas";
import type { AvailabilityTeacher, AvailabilityWeekData } from "@/features/availability/lib/types";
import {
  createTeacherAvailabilityOverrideAction,
  deleteTeacherAvailabilityOverrideAction,
  updateTeacherAvailabilityOverrideAction,
  upsertTeacherAvailabilityAction,
} from "@/features/availability/actions/availability-actions";
import { AvailabilityEditor } from "./availability-editor";
import { DeleteOverrideDialog } from "./delete-override-dialog";
import { MultiTeacherMatrix } from "./multi-teacher-matrix";
import { SingleTeacherMatrix } from "./single-teacher-matrix";
import { TeacherSelectorPanel } from "./teacher-selector-panel";
import { useAvailabilityViewState } from "../_hooks/use-availability-view-state";
import { useAvailabilityWeekUrlState } from "../_hooks/use-availability-week-url-state";

const EMPTY_TEACHER: AvailabilityTeacher = {
  teacherId: "",
  userId: "",
  fullName: "",
  email: null,
  templateEntries: [],
  overrides: [],
};

export function AdminAvailabilityPageClient({
  initialData,
}: {
  initialData: AvailabilityWeekData;
}) {
  const weekStart = initialData.weekStart;
  const { isWeekLoading, shiftWeek } = useAvailabilityWeekUrlState(weekStart);
  const {
    searchQuery,
    selectedTeacherIds,
    selectedTeachers,
    templateDialog,
    overrideDialog,
    overrideToDelete,
    visibleTeachers,
    setSearchQuery,
    setOverrideToDelete,
    toggleTeacherSelection,
    clearSelection,
    openTemplateDialog,
    closeTemplateDialog,
    openOverrideDialog,
    closeOverrideDialog,
  } = useAvailabilityViewState(initialData.teachers);
  const selectedTeacher = selectedTeachers.length === 1 ? selectedTeachers[0] : null;
  const templateMutations = useAvailabilityTemplateMutations({
    teacher: selectedTeacher ?? EMPTY_TEACHER,
    upsertAction: upsertTeacherAvailabilityAction,
  });
  const overrideMutations = useAvailabilityOverrideMutations({
    teacherId: selectedTeacher?.teacherId ?? "",
    createAction: createTeacherAvailabilityOverrideAction,
    updateAction: updateTeacherAvailabilityOverrideAction,
    deleteAction: deleteTeacherAvailabilityOverrideAction,
  });
  const isMutating = templateMutations.isMutating || overrideMutations.isMutating;

  async function handleTemplateSave(
    nextEntry: TeacherAvailabilityTemplateEditorInput,
    previousId?: string,
  ) {
    const success = await templateMutations.handleTemplateSave(nextEntry, previousId);
    if (success) {
      closeTemplateDialog(false);
    }
    return success;
  }

  async function handleOverrideCreate(payload: CreateTeacherAvailabilityOverrideInput) {
    const success = await overrideMutations.handleOverrideCreate(payload);
    if (success) {
      closeOverrideDialog(false);
    }
    return success;
  }

  async function handleOverrideUpdate(payload: UpdateTeacherAvailabilityOverrideInput) {
    const success = await overrideMutations.handleOverrideUpdate(payload);
    if (success) {
      closeOverrideDialog(false);
    }
    return success;
  }

  async function handleOverrideDelete() {
    const success = await overrideMutations.handleOverrideDelete(overrideToDelete);
    if (success) {
      setOverrideToDelete(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Доступность преподавателей</h1>
        <p className="text-sm text-muted-foreground">
          Сводный экран для анализа шаблонов и исключений по неделе.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <TeacherSelectorPanel
          teachers={visibleTeachers}
          allTeachersCount={initialData.teachers.length}
          selectedTeacherIds={selectedTeacherIds}
          weekStart={weekStart}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onTeacherToggle={toggleTeacherSelection}
          onClearSelection={clearSelection}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <AvailabilityWeekToolbar
            weekStart={weekStart}
            isWeekLoading={isWeekLoading}
            onPreviousWeek={() => shiftWeek(-1)}
            onNextWeek={() => shiftWeek(1)}
          />

          {selectedTeachers.length === 0 ? (
            <Card>
              <CardContent>
                <Empty className="min-h-90">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Users />
                    </EmptyMedia>
                    <EmptyTitle>Выберите преподавателя слева</EmptyTitle>
                    <EmptyDescription>
                      Для одного преподавателя откроется детальная сетка. Для нескольких
                      преподавателей страница покажет общую картину пересечений по неделе.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          ) : selectedTeacher ? (
            <>
              <SingleTeacherMatrix teacher={selectedTeacher} weekStart={weekStart} />
              <AvailabilityEditor
                teacher={selectedTeacher}
                weekStart={weekStart}
                isMutating={isMutating}
                onOpenTemplateDialog={openTemplateDialog}
                onDeleteTemplateEntry={templateMutations.handleTemplateDelete}
                onOpenOverrideDialog={openOverrideDialog}
                onDeleteOverride={setOverrideToDelete}
              />
            </>
          ) : (
            <MultiTeacherMatrix teachers={selectedTeachers} weekStart={weekStart} />
          )}
        </div>
      </div>

      {selectedTeacher ? (
        <>
          <TemplateEntryFormDialog
            key={`template-${format(weekStart, "yyyy-MM-dd")}-${templateDialog.entry?.id ?? "new"}-${templateDialog.open ? "open" : "closed"}`}
            open={templateDialog.open}
            teacherName={selectedTeacher.fullName}
            entry={templateDialog.entry}
            isSaving={isMutating}
            onOpenChange={closeTemplateDialog}
            onSubmit={handleTemplateSave}
          />

          <OverrideEntryFormDialog
            key={`override-${format(weekStart, "yyyy-MM-dd")}-${overrideDialog.entry?.id ?? "new"}-${overrideDialog.open ? "open" : "closed"}`}
            open={overrideDialog.open}
            teacherId={selectedTeacher.teacherId}
            teacherName={selectedTeacher.fullName}
            entry={overrideDialog.entry}
            isSaving={isMutating}
            onOpenChange={closeOverrideDialog}
            onCreate={handleOverrideCreate}
            onUpdate={handleOverrideUpdate}
          />

          <DeleteOverrideDialog
            open={Boolean(overrideToDelete)}
            onOpenChange={(open) => {
              if (!open) {
                setOverrideToDelete(null);
              }
            }}
            onConfirm={() => void handleOverrideDelete()}
          />
        </>
      ) : null}
    </div>
  );
}
