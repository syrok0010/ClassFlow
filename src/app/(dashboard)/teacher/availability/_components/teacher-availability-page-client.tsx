"use client";

import { useState } from "react";
import type { TeacherAvailabilityPageData } from "../_lib/types";
import { useTeacherAvailabilityMutations } from "../_hooks/use-teacher-availability-mutations";
import { useTeacherAvailabilityWeekUrlState } from "../_hooks/use-teacher-availability-week-url-state";
import { TeacherAvailabilityToolbar } from "./teacher-availability-toolbar";
import {
  TeacherAvailabilityTemplateEditor,
  type TemplateDialogState,
} from "./teacher-availability-template-editor";
import {
  TeacherAvailabilityOverridesPanel,
  type OverrideDialogState,
} from "./teacher-availability-overrides-panel";
import { TeacherAvailabilityPreview } from "./teacher-availability-preview";
import type {
  TeacherAvailabilityEntry,
  TeacherAvailabilityOverride,
} from "../_lib/types";

export function TeacherAvailabilityPageClient({
  initialData,
}: {
  initialData: TeacherAvailabilityPageData;
}) {
  const weekStart = initialData.weekStart;
  const teacher = initialData.teacher;
  const { isWeekLoading, shiftWeek } = useTeacherAvailabilityWeekUrlState(weekStart);
  const { isMutating, ...mutations } = useTeacherAvailabilityMutations({ teacher });
  const [selectedOverrideId, setSelectedOverrideId] = useState<string | null>(null);
  const [templateDialog, setTemplateDialog] = useState<TemplateDialogState>({
    open: false,
    entry: null,
  });
  const [overrideDialog, setOverrideDialog] = useState<OverrideDialogState>({
    open: false,
    entry: null,
  });
  const [overrideToDelete, setOverrideToDelete] = useState<TeacherAvailabilityOverride | null>(null);

  function openTemplateCreate() {
    setTemplateDialog({ open: true, entry: null });
  }

  function openTemplateEdit(entry: TeacherAvailabilityEntry) {
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

  function openOverrideEdit(entry: TeacherAvailabilityOverride) {
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
      if (selectedOverrideId === overrideToDelete?.id) {
        setSelectedOverrideId(null);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <TeacherAvailabilityToolbar
        weekStart={weekStart}
        isWeekLoading={isWeekLoading}
        onPreviousWeek={() => shiftWeek(-1)}
        onNextWeek={() => shiftWeek(1)}
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
        onDeleteEntry={(entry) => void mutations.handleTemplateDelete(entry)}
        onDialogChange={closeTemplateDialog}
        onSubmit={handleTemplateSave}
      />
    </div>
  );
}
