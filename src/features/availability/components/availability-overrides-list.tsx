import { CalendarDays, PencilLine, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
import type { AvailabilityOverrideEntry, AvailabilityTeacher } from "@/features/availability/lib/types";
import {
  AVAILABILITY_TYPE_BADGE_VARIANTS,
  AVAILABILITY_TYPE_LABELS,
  formatDateRange,
  formatTimeRange,
  getTeacherOverrideEntriesForWeek,
} from "@/features/availability/lib/utils";

export function AvailabilityOverridesList({
  teacher,
  weekStart,
  isSaving,
  selectedOverrideId,
  currentWeekSummary,
  emptyTitle,
  emptyDescription,
  editButtonTestId,
  deleteButtonTestId,
  onOpenEdit,
  onDelete,
  onSelectOverride,
}: {
  teacher: AvailabilityTeacher;
  weekStart: Date;
  isSaving: boolean;
  selectedOverrideId?: string | null;
  currentWeekSummary?: (count: number) => string;
  emptyTitle: string;
  emptyDescription: string;
  editButtonTestId?: string;
  deleteButtonTestId?: string;
  onOpenEdit: (entry: AvailabilityOverrideEntry) => void;
  onDelete: (entry: AvailabilityOverrideEntry) => void;
  onSelectOverride?: (overrideId: string | null) => void;
}) {
  const weekOverrides = getTeacherOverrideEntriesForWeek(teacher, weekStart);
  const weekOverrideIds = new Set(weekOverrides.map((entry) => entry.id));

  if (teacher.overrides.length === 0) {
    return (
      <FilterableEmptyState
        hasFilters={false}
        empty={{
          icon: <CalendarDays />,
          title: emptyTitle,
          description: emptyDescription,
          className: "min-h-80 py-8",
        }}
      />
    );
  }

  return (
    <>
      {currentWeekSummary && weekOverrides.length > 0 ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          {currentWeekSummary(weekOverrides.length)}
        </div>
      ) : null}

      {teacher.overrides
        .slice()
        .sort((left, right) => left.startTime.getTime() - right.startTime.getTime())
        .map((entry) => {
          const isSelected = selectedOverrideId === entry.id;

          return (
            <div
              key={entry.id}
              data-testid="teacher-override-row"
              role={onSelectOverride ? "button" : undefined}
              tabIndex={onSelectOverride ? 0 : undefined}
              className={`rounded-xl bg-background py-3 ${
                onSelectOverride
                  ? isSelected
                    ? "border border-primary bg-primary/5 px-3"
                    : "border border-transparent px-3 hover:border-border"
                  : ""
              }`}
              onClick={
                onSelectOverride
                  ? () => onSelectOverride(isSelected ? null : entry.id)
                  : undefined
              }
              onKeyDown={
                onSelectOverride
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectOverride(isSelected ? null : entry.id);
                      }
                    }
                  : undefined
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={AVAILABILITY_TYPE_BADGE_VARIANTS[entry.type]}>
                      {AVAILABILITY_TYPE_LABELS[entry.type]}
                    </Badge>
                    {weekOverrideIds.has(entry.id) ? (
                      <Badge variant="outline">РўРµРєСѓС‰Р°СЏ РЅРµРґРµР»СЏ</Badge>
                    ) : null}
                  </div>
                  <p className="font-medium text-foreground">
                    {formatDateRange(entry.startTime, entry.endTime)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatTimeRange(
                      entry.startTime.getHours() * 60 + entry.startTime.getMinutes(),
                      entry.endTime.getHours() * 60 + entry.endTime.getMinutes(),
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSaving}
                    data-testid={editButtonTestId}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenEdit(entry);
                    }}
                  >
                    <PencilLine data-icon="inline-start" />
                    Изменить
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isSaving}
                    data-testid={deleteButtonTestId}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(entry);
                    }}
                  >
                    <Trash2 data-icon="inline-start" />
                    Удалить
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
    </>
  );
}
