"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type MatrixRegion = "core" | "elective";

type RequirementsToolbarProps = {
  activeRegion: MatrixRegion;
  onActiveRegionChange: (value: MatrixRegion) => void;
  quickInputMode: boolean;
  onQuickInputModeChange: (value: boolean) => void;
};

export function RequirementsToolbar({
  activeRegion,
  onActiveRegionChange,
  quickInputMode,
  onQuickInputModeChange,
}: RequirementsToolbarProps) {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Учебный план</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Матрица нагрузки: группы x предметы.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <SegmentedControl
            size="sm"
            value={activeRegion}
            onChange={onActiveRegionChange}
            options={[
              { label: "Классы", value: "core" },
              { label: "Кружки", value: "elective" },
            ]}
          />
        </div>

        <div className="flex items-center gap-3">
        <Label htmlFor="quick-input-mode" className="text-sm font-medium">
          Режим быстрого ввода
        </Label>
        <Switch
          id="quick-input-mode"
          className="bg-gray-300"
          checked={quickInputMode}
          onCheckedChange={onQuickInputModeChange}
          aria-label="Переключить режим быстрого ввода"
        />
        </div>
      </div>
    </div>
  );
}
