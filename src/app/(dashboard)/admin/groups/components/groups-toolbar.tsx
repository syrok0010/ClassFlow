"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";

type Props = {
  filterType: "ALL" | "CLASS" | "ELECTIVE_GROUP";
  onFilterTypeChange: (v: "ALL" | "CLASS" | "ELECTIVE_GROUP") => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  onAddGroup: () => void;
  isAddingRow: boolean;
};

export function GroupsToolbar({
  filterType,
  onFilterTypeChange,
  searchQuery,
  onSearchQueryChange,
  onAddGroup,
  isAddingRow,
}: Props) {
  const filterItems = [
    { value: "ALL", label: "Все типы" },
    { value: "CLASS", label: "Только классы" },
    { value: "ELECTIVE_GROUP", label: "Только кружки" },
  ] as const;

  return (
    <div className="flex items-center gap-3">
      <Select
        value={filterType}
        onValueChange={(v) =>
          onFilterTypeChange(v as "ALL" | "CLASS" | "ELECTIVE_GROUP")
        }
        items={filterItems}
      >
        <SelectTrigger>
          <SelectValue placeholder="Тип группы" />
        </SelectTrigger>
        <SelectContent>
          {filterItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
