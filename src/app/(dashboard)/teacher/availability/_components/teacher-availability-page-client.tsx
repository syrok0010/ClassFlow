"use client";

import { useState } from "react";
import type {
  CreateTeacherAvailabilityOverrideInput,
  TeacherAvailabilityEntryInput,
  TeacherAvailabilityTemplateEditorInput,
  UpdateTeacherAvailabilityOverrideInput,
} from "@/features/availability/lib/schemas";
import type {
  AvailabilityOverrideEntry,
  AvailabilityTemplateEntry,
  TeacherAvailabilityPageData,
} from "@/features/availability/lib/types";
import { useAvailabilityOverrideMutations } from "@/features/availability/hooks/use-availability-override-mutations";
import { useAvailabilityTemplateMutations } from "@/features/availability/hooks/use-availability-template-mutations";
import { AvailabilityWeekToolbar } from "@/features/availability/components/availability-week-toolbar";
import {
  createTeacherAvailabilityOverrideAction,
  deleteTeacherAvailabilityOverrideAction,
  updateTeacherAvailabilityOverrideAction,
  upsertTeacherAvailabilityAction,
} from "@/features/availability/actions/availability-actions";
import { useTeacherAvailabilityWeekUrlState } from "../_hooks/use-teacher-availability-week-url-state";
import {
  TeacherAvailabilityTemplateEditor,
  type TemplateDialogState,
} from "./teacher-availability-template-editor";
import {
  TeacherAvailabilityOverridesPanel,
  type OverrideDialogState,
} from "./teacher-availability-overrides-panel";
import { TeacherAvailabilityPreview } from "./teacher-availability-preview";

export function TeacherAvailabilityPageClient({
  initialData,
}: {
  initialData: TeacherAvailabilityPageData;
}) {
  const weekStart = initialData.weekStart;
  const teacher = initialData.teacher;
  const { isWeekLoading, shiftWeek } = useTeacherAvailabilityWeekUrlState(weekStart);
  const templateMutations = useAvailabilityTemplateMutations({
    teacher,
    upsertAction: upsertTeacherAvailabilityAction,
  });
  const overrideMutations = useAvailabilityOverrideMutations({
    teacherId: teacher.teacherId,
    createAction: createTeacherAvailabilityOverrideAction,
    updateAction: updateTeacherAvailabilityOverrideAction,
    deleteAction: deleteTeacherAvailabilityOverrideAction,
  });
  const isMutating = templateMutations.isMutating || overrideMutations.isMutating;
  const [selectedOverrideId, setSelectedOverrideId] = useState<string | null>(null);
  const [templateDialog, setTemplateDialog] = useState<TemplateDialogState>({
    open: false,
    entry: null,
  });
  const [overrideDialog, setOverrideDialog] = useState<OverrideDialogState>({
    open: false,
    entry: null,
  });
  const [overrideToDelete, setOverrideToDelete] = useState<AvailabilityOverrideEntry | null>(null);

  function openTemplateCreate() {
    setTemplateDialog({ open: true, entry: null });
  }

  function openTemplateEdit(entry: AvailabilityTemplateEntry) {
    setTemplateDialog({ open: true, entry });
  }

  function closeTemplateDialog(open: boolean) {
    setTemplateDialog((current) => ({
      open,
      entry: open ? current.entry : null,
      draftDayOfWeek: open ? current.draftDayOfWeek : undefined,
      draftStartTime: open ? current.draftStartTime : undefined,
      draftEndTime: open ? current.draftEndTime : undefined,
    }));
  }

  function openOverrideCreate() {
    setOverrideDialog({ open: true, entry: null });
  }

  function openOverrideEdit(entry: AvailabilityOverrideEntry) {
    setOverrideDialog({ open: true, entry });
    setSelectedOverrideId(entry.id);
  }

  function closeOverrideDialog(open: boolean) {
    setOverrideDialog((current) => ({
      open,
      entry: open ? current.entry : null,
      draftDate: open ? current.draftDate : undefined,
      draftStartTime: open ? current.draftStartTime : undefined,
      draftEndTime: open ? current.draftEndTime : undefined,
    }));
  }

  async function handleTemplateSave(
    nextEntry: TeacherAvailabilityEntryInput | TeacherAvailabilityTemplateEditorInput,
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
      if (selectedOverrideId === overrideToDelete?.id) {
        setSelectedOverrideId(null);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AvailabilityWeekToolbar
        weekStart={weekStart}
        isWeekLoading={isWeekLoading}
        onPreviousWeek={() => shiftWeek(-1)}
        onNextWeek={() => shiftWeek(1)}
        previousButtonTestId="teacher-availability-prev-week"
        nextButtonTestId="teacher-availability-next-week"
        labelMinWidthClassName="min-w-56"
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <TeacherAvailabilityPreview
          teacher={teacher}
          weekStart={weekStart}
          selectedOverrideId={selectedOverrideId}
          onOpenTemplateEditAction={openTemplateEdit}
          onOpenOverrideEditAction={openOverrideEdit}
        />

        <TeacherAvailabilityOverridesPanel
          teacher={teacher}
          weekStart={weekStart}
          dialog={overrideDialog}
          selectedOverrideId={selectedOverrideId}
          overrideToDelete={overrideToDelete}
          isSaving={isMutating}
          onOpenCreate={openOverrideCreate}
          onOpenEdit={openOverrideEdit}
          onSelectOverride={setSelectedOverrideId}
          onRequestDelete={setOverrideToDelete}
          onDialogChange={closeOverrideDialog}
          onDeleteDialogChange={(open) => {
            if (!open) {
              setOverrideToDelete(null);
            }
          }}
          onCreate={handleOverrideCreate}
          onUpdate={handleOverrideUpdate}
          onDelete={() => void handleOverrideDelete()}
        />
      </div>

      <TeacherAvailabilityTemplateEditor
        teacher={teacher}
        dialog={templateDialog}
        isSaving={isMutating}
        onOpenCreate={openTemplateCreate}
        onOpenEdit={openTemplateEdit}
        onDeleteEntry={(entry) => void templateMutations.handleTemplateDelete(entry)}
        onDialogChange={closeTemplateDialog}
        onSubmit={handleTemplateSave}
      />
    </div>
  );
}
