import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";

interface TeacherSubjectsEmptyStateProps {
  hasFilters: boolean;
  onResetFilters: () => void;
  onCreateFirst: () => void;
}

export function TeacherSubjectsEmptyState({
  hasFilters,
  onResetFilters,
  onCreateFirst,
}: TeacherSubjectsEmptyStateProps) {
  return (
    <FilterableEmptyState
      hasFilters={hasFilters}
      onResetFilters={onResetFilters}
      onCreateFirst={onCreateFirst}
      emptyTitle="У преподавателя пока не назначено ни одного предмета"
      emptyDescription="Добавьте предметы и диапазоны классов, чтобы система могла учитывать этого преподавателя в учебном плане и расписании."
      createFirstLabel="+ Добавить первый предмет"
    />
  );
}
