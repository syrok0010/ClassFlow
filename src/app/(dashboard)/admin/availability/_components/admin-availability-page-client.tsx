"use client";

import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { AdminAvailabilityWeekData } from "../_lib/types";
import { AvailabilityEditor } from "./availability-editor";
import { AnalyzerToolbar } from "./analyzer-toolbar";
import { DeleteOverrideDialog } from "./delete-override-dialog";
import { MultiTeacherMatrix } from "./multi-teacher-matrix";
import { OverrideEntryDialog } from "./override-entry-dialog";
import { SingleTeacherMatrix } from "./single-teacher-matrix";
import { TeacherSelectorPanel } from "./teacher-selector-panel";
import { TemplateEntryDialog } from "./template-entry-dialog";
import { useAvailabilityMutations } from "../_hooks/use-availability-mutations";
import { useAvailabilityViewState } from "../_hooks/use-availability-view-state";
import { useAvailabilityWeekUrlState } from "../_hooks/use-availability-week-url-state";

export function AdminAvailabilityPageClient({
  initialData,
}: {
  initialData: AdminAvailabilityWeekData;
}) {
  const weekStart = initialData.weekStart;
  const {
    isWeekLoading,
    shiftWeek,
  } = useAvailabilityWeekUrlState(weekStart);
  const {
    searchQuery,
    selectedTeacherIds,
    selectedTeachers,
    selectedTeacher,
    effectiveMode,
    templateDialog,
    overrideDialog,
    overrideToDelete,
    visibleTeachers,
    setSearchQuery,
    setMode,
    setOverrideToDelete,
    toggleTeacherSelection,
    clearSelection,
    openTemplateDialog,
    closeTemplateDialog,
    openOverrideDialog,
    closeOverrideDialog,
  } = useAvailabilityViewState(initialData.teachers);
  const { isMutating, ...mutations } = useAvailabilityMutations({
    selectedTeacher,
  });

  async function handleTemplateSave(...args: Parameters<typeof mutations.handleTemplateSave>) {
    const success = await mutations.handleTemplateSave(...args);

    if (success) {
      closeTemplateDialog(false);
    }

    return success;
  }

  async function handleOverrideCreate(...args: Parameters<typeof mutations.handleOverrideCreate>) {
    const success = await mutations.handleOverrideCreate(...args);

    if (success) {
      closeOverrideDialog(false);
    }

    return success;
  }

  async function handleOverrideUpdate(...args: Parameters<typeof mutations.handleOverrideUpdate>) {
    const success = await mutations.handleOverrideUpdate(...args);

    if (success) {
      closeOverrideDialog(false);
    }

    return success;
  }

  async function handleOverrideDelete() {
    const success = await mutations.handleOverrideDelete(overrideToDelete);

    if (success) {
      setOverrideToDelete(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Доступность преподавателей</h1>
        <p className="text-sm text-muted-foreground">
          Сводный экран для анализа шаблонов, исключений и занятости по фактическому расписанию.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <TeacherSelectorPanel
          teachers={visibleTeachers}
          allTeachersCount={initialData.teachers.length}
          selectedTeacherIds={selectedTeacherIds}
          weekStart={weekStart}
          searchQuery={searchQuery}
          mode={effectiveMode}
          onSearchQueryChange={setSearchQuery}
          onTeacherToggle={toggleTeacherSelection}
          onClearSelection={clearSelection}
          onEditSelectedTeacher={() => setMode("edit")}
        />

        <div className="flex min-w-0 flex-col gap-4">
          <AnalyzerToolbar
            weekStart={weekStart}
            mode={effectiveMode}
            canEdit={Boolean(selectedTeacher)}
            isWeekLoading={isWeekLoading}
            onModeChange={setMode}
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
              {effectiveMode === "edit" ? (
                <AvailabilityEditor
                  teacher={selectedTeacher}
                  weekStart={weekStart}
                  isMutating={isMutating}
                  onAddTemplateEntry={(dayOfWeek) => openTemplateDialog(dayOfWeek)}
                  onEditTemplateEntry={(entry) => openTemplateDialog(entry.dayOfWeek, entry)}
                  onDeleteTemplateEntry={mutations.handleTemplateDelete}
                  onAddOverride={() => openOverrideDialog()}
                  onEditOverride={(entry) => openOverrideDialog(entry)}
                  onDeleteOverride={setOverrideToDelete}
                />
              ) : null}
            </>
          ) : (
            <MultiTeacherMatrix teachers={selectedTeachers} weekStart={weekStart} />
          )}
        </div>
      </div>

      {selectedTeacher ? (
        <>
          <TemplateEntryDialog
            key={`${weekStart}-${templateDialog.entry?.id ?? "new"}-${templateDialog.dayOfWeek}-${templateDialog.open ? "open" : "closed"}`}
            open={templateDialog.open}
            teacher={selectedTeacher}
            dayOfWeek={templateDialog.dayOfWeek}
            entry={templateDialog.entry}
            isSaving={isMutating}
            onOpenChange={closeTemplateDialog}
            onSubmit={handleTemplateSave}
          />

          <OverrideEntryDialog
            key={`${weekStart}-${overrideDialog.entry?.id ?? "new"}-${overrideDialog.open ? "open" : "closed"}`}
            open={overrideDialog.open}
            teacher={selectedTeacher}
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
