import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <p className="text-base font-medium">Справочник предметов пока пуст</p>
      <p className="max-w-xl text-sm text-muted-foreground">
        Добавьте академические предметы, допы и режимные моменты, чтобы настроить кабинеты и учебный план.
      </p>
      <Button onClick={onCreateFirst}>+ Добавить первый предмет</Button>
    </div>
  );
}
