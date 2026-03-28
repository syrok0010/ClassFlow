import { ArrowDownAZ, Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SUBJECT_FILTER_OPTIONS,
  SUBJECT_SORT_OPTIONS,
  SUBJECT_SORT_SELECT_ITEMS,
  type SubjectFilterType,
  type SubjectSortKey,
} from "../_lib/constants";

interface SubjectsToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  filterType: SubjectFilterType;
  onFilterTypeChange: (value: SubjectFilterType) => void;
  sortBy: SubjectSortKey;
  onSortByChange: (value: SubjectSortKey) => void;
  grouped: boolean;
  onGroupedChange: (value: boolean) => void;
  onAddSubject: () => void;
  isAddingRow: boolean;
}

export function SubjectsToolbar({
  searchQuery,
  onSearchQueryChange,
  filterType,
  onFilterTypeChange,
  sortBy,
  onSortByChange,
  grouped,
  onGroupedChange,
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

      <Select
        value={sortBy}
        onValueChange={(value) => onSortByChange(value as SubjectSortKey)}
        items={SUBJECT_SORT_SELECT_ITEMS}
      >
        <SelectTrigger size="sm" className="w-40">
          <ArrowDownAZ className="size-3.5 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUBJECT_SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant={grouped ? "secondary" : "outline"}
        size="sm"
        onClick={() => onGroupedChange(!grouped)}
      >
        <Filter className="size-3.5" data-icon="inline-start" />
        Группировать по типу
      </Button>

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
