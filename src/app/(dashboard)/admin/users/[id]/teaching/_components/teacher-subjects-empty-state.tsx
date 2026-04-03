import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <p className="text-base font-medium">У преподавателя пока не назначено ни одного предмета</p>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Добавьте предметы и диапазоны классов, чтобы система могла учитывать этого преподавателя в учебном плане и расписании.
      </p>
      <Button onClick={onCreateFirst}>+ Добавить первый предмет</Button>
    </div>
  );
}
