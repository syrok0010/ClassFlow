import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterableEmptyStateProps {
  hasFilters: boolean;
  onResetFilters: () => void;
  onCreateFirst: () => void;
  emptyTitle: string;
  emptyDescription: string;
  createFirstLabel: string;
}

export function FilterableEmptyState({
  hasFilters,
  onResetFilters,
  onCreateFirst,
  emptyTitle,
  emptyDescription,
  createFirstLabel,
}: FilterableEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2">
        <Search className="size-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">Ничего не найдено</p>
        <Button variant="link" className="h-auto p-0" onClick={onResetFilters}>
          Сбросить фильтры
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
      <p className="text-base font-medium">{emptyTitle}</p>
      <p className="max-w-2xl text-sm text-muted-foreground">{emptyDescription}</p>
      <Button onClick={onCreateFirst}>{createFirstLabel}</Button>
    </div>
  );
}
