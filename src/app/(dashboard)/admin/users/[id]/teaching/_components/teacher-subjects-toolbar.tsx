import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SUBJECT_FILTERS } from "@/lib/constants";
import type { SubjectFilterType } from "@/lib/types";

interface TeacherSubjectsToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  filterType: SubjectFilterType;
  onFilterTypeChange: (value: SubjectFilterType) => void;
  onAddSubject: () => void;
  isAddingRow: boolean;
}

export function TeacherSubjectsToolbar({
  searchQuery,
  onSearchQueryChange,
  filterType,
  onFilterTypeChange,
  onAddSubject,
  isAddingRow,
}: TeacherSubjectsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 max-w-sm flex-1">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию предмета..."
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="pl-8"
        />
      </div>

      <SegmentedControl
        value={filterType}
        onChange={onFilterTypeChange}
        options={SUBJECT_FILTERS}
        size="sm"
      />

      {!isAddingRow ? (
        <Button className="ml-auto" onClick={onAddSubject}>
          <Plus className="size-4" data-icon="inline-start" />
          Добавить предмет
        </Button>
      ) : null}
    </div>
  );
}
