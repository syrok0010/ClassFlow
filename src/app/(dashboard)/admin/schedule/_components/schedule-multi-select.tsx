"use client";

import { useMemo } from "react";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox";

export type FilterOption = {
  id: string;
  label: string;
};

interface ScheduleMultiSelectProps {
  title: string;
  options: FilterOption[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
}

export function ScheduleMultiSelect({
  title,
  options,
  selectedIds,
  onChange,
}: ScheduleMultiSelectProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const sortedOptions = useMemo(() => {
    const selected: FilterOption[] = [];
    const unselected: FilterOption[] = [];

    for (const option of options) {
      if (selectedSet.has(option.id)) {
        selected.push(option);
      } else {
        unselected.push(option);
      }
    }

    return [...selected, ...unselected];
  }, [options, selectedSet]);

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(option.id)),
    [options, selectedSet],
  );

  return (
    <div className="space-y-1 p-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>

      <Combobox
        items={sortedOptions}
        multiple
        itemToStringLabel={(item) => item.label}
        itemToStringValue={(item) => item.id}
        value={selectedOptions}
        onValueChange={(value) => {
          const next = Array.isArray(value) ? value : [];
          onChange(next.map((item) => item.id));
        }}
      >
        <ComboboxChips className="min-h-9 bg-white">
          <ComboboxValue>
            {selectedOptions.map((option) => (
              <ComboboxChip key={option.id}>{option.label}</ComboboxChip>
            ))}
          </ComboboxValue>
          <ComboboxChipsInput placeholder={selectedOptions.length > 0 ? "Добавить..." : "Все"} />
        </ComboboxChips>

        <ComboboxContent className="w-72 bg-white p-0">
          <ComboboxEmpty className="py-3">Ничего не найдено</ComboboxEmpty>
          <ComboboxList>
            <ComboboxCollection>
              {(option: FilterOption) => (
                <ComboboxItem key={option.id} value={option}>
                  <span className="truncate">{option.label}</span>
                </ComboboxItem>
              )}
            </ComboboxCollection>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
