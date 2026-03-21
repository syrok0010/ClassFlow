import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SegmentedControl,
  type SegmentedControlOption,
} from "@/components/ui/segmented-control";
import { Plus, Search } from "lucide-react";

type FilterType = "all" | "CLASS" | "ELECTIVE_GROUP";

const FILTER_OPTIONS: readonly SegmentedControlOption<FilterType>[] = [
  { value: "all", label: "Все" },
  { value: "CLASS", label: "Классы" },
  { value: "ELECTIVE_GROUP", label: "Кружки" },
] as const;

interface GroupsToolbarProps {
  filterType: FilterType;
  onFilterTypeChange: (v: FilterType) => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  onAddGroup: () => void;
  isAddingRow: boolean;
}

export function GroupsToolbar({
  filterType,
  onFilterTypeChange,
  searchQuery,
  onSearchQueryChange,
  onAddGroup,
  isAddingRow,
}: GroupsToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <SegmentedControl
        value={filterType}
        onChange={onFilterTypeChange}
        options={FILTER_OPTIONS}
        size="sm"
      />

      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="ml-auto">
        {!isAddingRow && (
          <Button onClick={onAddGroup}>
            <Plus className="size-4" data-icon="inline-start" />
            Добавить класс/группу
          </Button>
        )}
      </div>
    </div>
  );
}
