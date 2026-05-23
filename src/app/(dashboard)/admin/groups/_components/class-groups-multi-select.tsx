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
import { cn } from "@/lib/utils";

export type ClassGroupOption = {
  id: string;
  label: string;
};

interface ClassGroupsMultiSelectProps {
  options: ClassGroupOption[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  chipsClassName?: string;
  disabled?: boolean;
  invalid?: boolean;
}

export function ClassGroupsMultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = "Выберите классы",
  className,
  chipsClassName,
  disabled = false,
  invalid = false,
}: ClassGroupsMultiSelectProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const sortedOptions = useMemo(() => {
    const selected: ClassGroupOption[] = [];
    const unselected: ClassGroupOption[] = [];

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
    [options, selectedSet]
  );

  return (
    <Combobox
      items={sortedOptions}
      multiple
      disabled={disabled}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.id}
      value={selectedOptions}
      onValueChange={(value) => {
        const next = Array.isArray(value) ? value : [];
        onChange(next.map((item) => item.id));
      }}
    >
      <ComboboxChips
        className={cn(
          "min-h-9 bg-background",
          invalid && "border-destructive ring-3 ring-destructive/20",
          chipsClassName
        )}
      >
        <ComboboxValue>
          {selectedOptions.map((option) => (
            <ComboboxChip key={option.id}>{option.label}</ComboboxChip>
          ))}
        </ComboboxValue>
        <ComboboxChipsInput
          placeholder={selectedOptions.length > 0 ? "Добавить класс..." : placeholder}
          className={className}
        />
      </ComboboxChips>

      <ComboboxContent className="w-80 bg-white p-0">
        <ComboboxEmpty className="py-3">Ничего не найдено</ComboboxEmpty>
        <ComboboxList>
          <ComboboxCollection>
            {(option: ClassGroupOption) => (
              <ComboboxItem key={option.id} value={option}>
                <span className="truncate">{option.label}</span>
              </ComboboxItem>
            )}
          </ComboboxCollection>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
