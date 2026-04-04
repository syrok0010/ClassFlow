import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";

interface SubjectsEmptyStateProps {
  hasFilters: boolean;
  onResetFilters: () => void;
  onCreateFirst: () => void;
}

export function SubjectsEmptyState({
  hasFilters,
  onResetFilters,
  onCreateFirst,
}: SubjectsEmptyStateProps) {
  return (
    <FilterableEmptyState
      hasFilters={hasFilters}
      onResetFilters={onResetFilters}
      onCreateFirst={onCreateFirst}
      emptyTitle="Справочник предметов пока пуст"
      emptyDescription="Добавьте академические, дополнительные предметы и режимные моменты, чтобы настроить кабинеты и учебный план."
      createFirstLabel="+ Добавить первый предмет"
    />
  );
}
