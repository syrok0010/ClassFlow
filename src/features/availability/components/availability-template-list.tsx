import { CalendarDays, PencilLine, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
import type { AvailabilityTeacher, AvailabilityTemplateEntry } from "@/features/availability/lib/types";
import {
  AVAILABILITY_TYPE_BADGE_VARIANTS,
  AVAILABILITY_TYPE_LABELS,
  DAY_CONFIG,
  formatTimeRange,
} from "@/features/availability/lib/utils";

export function AvailabilityTemplateList({
  teacher,
  isSaving,
  emptyTitle,
  emptyDescription,
  groupEmptyDescription,
  editButtonTestId,
  deleteButtonTestId,
  onOpenCreate,
  onOpenEdit,
  onDeleteEntry,
}: {
  teacher: AvailabilityTeacher;
  isSaving: boolean;
  emptyTitle: string;
  emptyDescription: string;
  groupEmptyDescription: string;
  editButtonTestId?: string;
  deleteButtonTestId?: string;
  onOpenCreate?: () => void;
  onOpenEdit: (entry: AvailabilityTemplateEntry) => void;
  onDeleteEntry: (entry: AvailabilityTemplateEntry) => void;
}) {
  const dayLabelsByDayOfWeek = new Map(DAY_CONFIG.map((day) => [day.dayOfWeek, day.label]));
  const templateGroups = (["PREFERRED", "AVAILABLE", "UNAVAILABLE"] as const).map((type) => ({
    type,
    label: AVAILABILITY_TYPE_LABELS[type],
    entries: teacher.templateEntries
      .filter((entry) => entry.type === type)
      .slice()
      .sort((left, right) =>
        left.dayOfWeek !== right.dayOfWeek
          ? left.dayOfWeek - right.dayOfWeek
          : left.startTime - right.startTime,
      ),
  }));

  if (teacher.templateEntries.length === 0) {
    return (
      <FilterableEmptyState
        hasFilters={false}
        empty={{
          icon: <CalendarDays />,
          title: emptyTitle,
          description: emptyDescription,
          className: "min-h-72 py-8",
        }}
      />
    );
  }

  return (
    <>
      {templateGroups.map((group) => (
        <div key={group.type} className="rounded-xl bg-background">
          <div className="border-b py-2">
            <Badge variant={AVAILABILITY_TYPE_BADGE_VARIANTS[group.type]}>{group.label}</Badge>
          </div>
          <div className="flex flex-col gap-2 py-3">
            {group.entries.length === 0 ? (
              <div className="rounded-lg text-sm text-muted-foreground">{groupEmptyDescription}</div>
            ) : (
              group.entries.map((entry) => (
                <div
                  key={entry.id}
                  data-testid="teacher-template-row"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium text-foreground">
                      {dayLabelsByDayOfWeek.get(entry.dayOfWeek)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatTimeRange(entry.startTime, entry.endTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      data-testid={editButtonTestId}
                      onClick={() => onOpenEdit(entry)}
                    >
                      <PencilLine data-icon="inline-start" />
                      Изменить
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isSaving}
                      data-testid={deleteButtonTestId}
                      onClick={() => void onDeleteEntry(entry)}
                    >
                      <Trash2 data-icon="inline-start" />
                      Удалить
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
      {onOpenCreate ? null : null}
    </>
  );
}
