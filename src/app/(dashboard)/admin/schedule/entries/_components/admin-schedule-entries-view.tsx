"use client";

import { useMemo, useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { useQueryState } from "nuqs";

import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DEFAULT_SCHEDULE_VIEW, ReadonlyScheduleBrowser } from "@/features/schedule";

import { AdminScheduleEventCard } from "../../_components/admin-schedule-event-card";
import type {
  AdminScheduleEntriesOption,
  AdminScheduleEntriesPageData,
  AdminScheduleEntriesScope,
} from "../_lib/types";

type AdminScheduleEntriesViewProps = AdminScheduleEntriesPageData;

const SCOPE_LABELS: Record<AdminScheduleEntriesScope, string> = {
  group: "Группы",
  teacher: "Преподаватели",
  room: "Кабинеты",
};

const SCOPE_PLACEHOLDERS: Record<AdminScheduleEntriesScope, string> = {
  group: "Выберите группу",
  teacher: "Выберите преподавателя",
  room: "Выберите кабинет",
};

export function AdminScheduleEntriesView({
  anchorDate,
  dateParam,
  events,
  options,
  scope,
  selectedTarget,
  targetId,
  viewMode,
}: AdminScheduleEntriesViewProps) {
  const [isPending, startTransition] = useTransition();
  const [currentScope, setCurrentScope] = useQueryState("scope", {
    defaultValue: scope,
    shallow: false,
    startTransition,
  });
  const [currentTargetId, setCurrentTargetId] = useQueryState("targetId", {
    defaultValue: targetId ?? "",
    shallow: false,
    startTransition,
  });

  const optimisticScope = parseScope(currentScope);
  const currentOptions = options[optimisticScope];
  const optimisticSelectedTarget = useMemo(
    () => currentOptions.find((option) => option.id === currentTargetId) ?? null,
    [currentOptions, currentTargetId],
  );
  const isRefreshing =
    isPending ||
    optimisticScope !== scope ||
    (currentTargetId || null) !== (targetId ?? null);
  const visibleSelectedTarget = optimisticSelectedTarget ?? selectedTarget;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 text-card-foreground shadow-sm">
        <div className="overflow-x-auto pb-1">
          <SegmentedControl
            value={optimisticScope}
            onChange={(nextScope) => {
              void setCurrentTargetId(null);
              void setCurrentScope(nextScope === "group" ? null : nextScope);
            }}
            options={[
              { value: "group", label: SCOPE_LABELS.group, disabled: isRefreshing },
              { value: "teacher", label: SCOPE_LABELS.teacher, disabled: isRefreshing },
              { value: "room", label: SCOPE_LABELS.room, disabled: isRefreshing },
            ]}
            size="sm"
          />
        </div>

        <div className="grid gap-1.5 sm:max-w-md">
          <Label htmlFor="admin-schedule-entries-target">
            {SCOPE_LABELS[optimisticScope]}
          </Label>
          <Combobox
            items={currentOptions}
            itemToStringLabel={(item) => item.label}
            itemToStringValue={(item) => item.id}
            value={visibleSelectedTarget}
            onValueChange={(value) => {
              const nextValue = normalizeComboboxValue(value);
              void setCurrentTargetId(nextValue?.id ?? null);
            }}
          >
            <ComboboxInput
              id="admin-schedule-entries-target"
              placeholder={SCOPE_PLACEHOLDERS[optimisticScope]}
              disabled={isRefreshing}
              showClear
            />
            <ComboboxContent className="w-80 bg-white p-0">
              <ComboboxEmpty className="py-3">Ничего не найдено</ComboboxEmpty>
              <ComboboxList>
                <ComboboxCollection>
                  {(option: AdminScheduleEntriesOption) => (
                    <ComboboxItem key={option.id} value={option}>
                      <div className="min-w-0">
                        <div className="truncate">{option.label}</div>
                        {option.description ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        ) : null}
                      </div>
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
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
        renderEvent={(event) => <AdminScheduleEventCard event={event} />}
      />
    </div>
  );
}

function parseScope(value: string | null): AdminScheduleEntriesScope {
  return value === "teacher" || value === "room" ? value : "group";
}

function normalizeComboboxValue(
  value: AdminScheduleEntriesOption | AdminScheduleEntriesOption[] | null,
): AdminScheduleEntriesOption | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}
