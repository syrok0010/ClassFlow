"use client";

import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { DEFAULT_SCHEDULE_VIEW, ReadonlyScheduleBrowser } from "@/features/schedule";

import { ScheduleDeleteDialog } from "../../_components/schedule-delete-dialog";
import {
  type ScheduleEditorDraft,
  ScheduleEventEditorDialog,
} from "../../_components/schedule-event-editor-dialog";
import { AdminScheduleEventCard } from "../../_components/admin-schedule-event-card";
import type { AdminSchedulePageData, AdminScheduleEvent } from "../../_lib/admin-schedule-types";
import { buildDraftFromEvent } from "../../_lib/admin-schedule-template-commands";
import {
  deleteAdminScheduleEntryAction,
  updateAdminScheduleEntryAction,
} from "../_actions/schedule-entry-actions";
import type {
  AdminScheduleEntriesPageData,
  AdminScheduleEntriesScope,
  ScheduleTargetOption
} from "../_lib/types";

type AdminScheduleEntriesViewProps = AdminScheduleEntriesPageData & Pick<
  AdminSchedulePageData,
  | "classRows"
  | "subjectOptions"
  | "directGroupOptions"
  | "electiveGroupOptions"
  | "roomOptions"
  | "teacherOptions"
  | "lessonDurationByGroupSubject"
>;

export function AdminScheduleEntriesView({
  anchorDate,
  dateParam,
  events,
  options,
  scope,
  selectedTarget,
  targetId,
  viewMode,
  classRows,
  subjectOptions,
  directGroupOptions,
  electiveGroupOptions,
  roomOptions,
  teacherOptions,
  lessonDurationByGroupSubject,
}: AdminScheduleEntriesViewProps) {
  const router = useRouter();
  const [{ scope: currentScope, targetId: currentTargetId }, setTargetQuery] =
      useQueryStates(
          {
            scope: parseAsStringLiteral(["group", "teacher", "room"]).withDefault("group"),
            targetId: parseAsString.withDefault(""),
          },
          {
            shallow: false,
          },
      );
  const [targetInputValue, setTargetInputValue] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<AdminScheduleEvent | null>(null);
  const [editingDraft, setEditingDraft] = useState<ScheduleEditorDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminScheduleEvent | null>(null);

  const optimisticScope = parseScope(currentScope);
  const classOptions = useMemo(
    () => classRows.map((row) => ({ id: row.id, label: row.name })),
    [classRows],
  );
  const targetOptions = useMemo(
    () => buildTargetOptions(options),
    [options],
  );
  const optimisticSelectedTarget = useMemo(
    () =>
      targetOptions.find(
        (option) =>
          option.scope === optimisticScope && option.targetId === currentTargetId,
      ) ?? null,
    [currentTargetId, optimisticScope, targetOptions],
  );
  const confirmedSelectedTarget = useMemo(
    () =>
      targetOptions.find(
        (option) => option.scope === scope && option.targetId === targetId,
      ) ?? null,
    [scope, targetId, targetOptions],
  );
  const visibleSelectedTarget = optimisticSelectedTarget ?? confirmedSelectedTarget;
  const effectiveTargetInputValue =
    targetInputValue ?? visibleSelectedTarget?.label ?? "";
  const filteredTargetOptions = useMemo(
    () => filterTargetOptions(targetOptions, effectiveTargetInputValue),
    [effectiveTargetInputValue, targetOptions],
  );
  const comboboxValue =
    visibleSelectedTarget && effectiveTargetInputValue === visibleSelectedTarget.label
      ? visibleSelectedTarget
      : null;
  const fixedDayLabel = editingEvent
    ? format(editingEvent.start, "EEEE, d MMMM", { locale: ru })
    : null;
  const handleEdit = useCallback((event: AdminScheduleEvent) => {
    setEditingEvent(event);
    setEditingDraft(buildDraftFromEvent(event));
  }, []);
  const handleDelete = useCallback((event: AdminScheduleEvent) => {
    setDeleteTarget(event);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid w-full gap-1.5 sm:mx-auto sm:max-w-md">
        <Combobox
          items={targetOptions}
          filteredItems={filteredTargetOptions}
          itemToStringLabel={(item) => item.label}
          itemToStringValue={(item) => item.id}
          inputValue={effectiveTargetInputValue}
          onInputValueChange={(inputValue, eventDetails) => {
            if (
              eventDetails.reason === "input-change" ||
              eventDetails.reason === "input-clear" ||
              eventDetails.reason === "clear-press"
            ) {
              setTargetInputValue(inputValue);
            }
          }}
          value={comboboxValue}
          onValueChange={(value) => {
            const nextValue = normalizeComboboxValue(value);
            setTargetInputValue(nextValue ? null : "");

            void setTargetQuery({
              scope: nextValue && nextValue.scope !== "group" ? nextValue.scope : null,
              targetId: nextValue?.targetId ?? null,
            });
          }}
        >
          <ComboboxInput
            id="admin-schedule-entries-target"
            placeholder="Выберите группу, преподавателя или кабинет"
            onFocus={(event) => event.currentTarget.select()}
            showClear
          />
          <ComboboxContent className="w-80 bg-white p-0">
            <ComboboxEmpty className="py-3">Ничего не найдено</ComboboxEmpty>
            <ComboboxList>
              <ComboboxCollection>
                {(option: ScheduleTargetOption) => (
                  <ComboboxItem key={option.id} value={option}>
                    <div className="min-w-0">
                      <div className="truncate">{option.label}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      <ReadonlyScheduleBrowser
        anchorDate={anchorDate}
        dateParam={dateParam}
        viewMode={viewMode}
        events={events}
        defaultView={DEFAULT_SCHEDULE_VIEW}
        emptyState={{
          icon: <CalendarDays />,
          title: selectedTarget
            ? "В выбранном периоде нет занятий"
            : "Выберите группу, преподавателя или кабинет",
          description: selectedTarget
            ? "Проверьте другой период или примените недельный шаблон к фактическому расписанию."
            : "После выбора здесь появится расписание.",
        }}
        renderEvent={(event) => (
          <AdminScheduleEventCard
            event={event}
            showActions
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      />

      <ScheduleEventEditorDialog
        open={Boolean(editingEvent && editingDraft)}
        title="Редактирование записи"
        description="Измените поля карточки. Изменения будут применены только к выбранной дате."
        draft={editingDraft}
        subjectOptions={subjectOptions}
        classOptions={classOptions}
        classRows={classRows}
        directGroupOptions={directGroupOptions}
        electiveGroupOptions={electiveGroupOptions}
        roomOptions={roomOptions}
        teacherOptions={teacherOptions}
        lessonDurationByGroupSubject={lessonDurationByGroupSubject}
        lockDaySelection
        fixedDayLabel={fixedDayLabel}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEvent(null);
            setEditingDraft(null);
          }
        }}
        onSave={async (draft) => {
          if (!editingEvent) {
            return "Запись для редактирования не выбрана";
          }

          const result = await updateAdminScheduleEntryAction({
            entryId: editingEvent.id,
            date: format(editingEvent.start, "yyyy-MM-dd"),
            ...draft,
          });

          if (result.error) {
            return result.error;
          }

          router.refresh();
          setEditingEvent(null);
          setEditingDraft(null);
          return null;
        }}
      />

      <ScheduleDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={async () => {
          if (!deleteTarget) {
            return;
          }

          const result = await deleteAdminScheduleEntryAction(deleteTarget.id);
          if (!result.error) {
            router.refresh();
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}

function parseScope(value: string | null): AdminScheduleEntriesScope {
  return value === "teacher" || value === "room" ? value : "group";
}

function buildTargetOptions(
  options: AdminScheduleEntriesPageData["options"],
): ScheduleTargetOption[] {
  return [
    ...options.group.map((option) => ({
      id: `group:${option.id}`,
      scope: "group" as const,
      targetId: option.id,
      label: option.label,
      description: `Группа${option.description ? ` · ${option.description}` : ""}`,
    })),
    ...options.teacher.map((option) => ({
      id: `teacher:${option.id}`,
      scope: "teacher" as const,
      targetId: option.id,
      label: option.label,
      description: "Преподаватель",
    })),
    ...options.room.map((option) => ({
      id: `room:${option.id}`,
      scope: "room" as const,
      targetId: option.id,
      label: option.label,
      description: `Кабинет${option.description ? ` · ${option.description}` : ""}`,
    })),
  ];
}

function filterTargetOptions(
  options: ScheduleTargetOption[],
  query: string,
): ScheduleTargetOption[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ru");

  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) =>
    `${option.label} ${option.description}`
      .toLocaleLowerCase("ru")
      .includes(normalizedQuery),
  );
}

function normalizeComboboxValue(
  value: ScheduleTargetOption | ScheduleTargetOption[] | null,
): ScheduleTargetOption | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}
