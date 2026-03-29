import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  SUBJECT_FILTER_OPTIONS,
  type SubjectFilterType,
} from "../_lib/constants";

interface SubjectsToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  filterType: SubjectFilterType;
  onFilterTypeChange: (value: SubjectFilterType) => void;
  onAddSubject: () => void;
  isAddingRow: boolean;
}

export function SubjectsToolbar({
  searchQuery,
  onSearchQueryChange,
  filterType,
  onFilterTypeChange,
  onAddSubject,
  isAddingRow,
}: SubjectsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-56 flex-1 max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию..."
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="pl-8"
        />
      </div>

      <SegmentedControl
        value={filterType}
        onChange={onFilterTypeChange}
        options={SUBJECT_FILTER_OPTIONS}
        size="sm"
      />

      <div className="ml-auto">
        {!isAddingRow ? (
          <Button onClick={onAddSubject}>
            <Plus className="size-4" data-icon="inline-start" />
            Добавить предмет
          </Button>
        ) : null}
      </div>
    </div>
  );
}
