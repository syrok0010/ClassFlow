"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { QuickInputDurations } from "../_lib/types";

type MatrixRegion = "core" | "elective";

const QUICK_DURATION_LIMITS = {
  durationInMinutes: { min: 1, max: 180 },
  breakDuration: { min: 0, max: 60 },
} as const;

type RequirementsToolbarProps = {
  activeRegion: MatrixRegion;
  onActiveRegionChange: (value: MatrixRegion) => void;
  quickInputMode: boolean;
  onQuickInputModeChange: (value: boolean) => void;
  quickInputDurations: QuickInputDurations;
  onQuickInputDurationsChange: (value: QuickInputDurations) => void;
};

function clampInteger(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function RequirementsToolbar({
  activeRegion,
  onActiveRegionChange,
  quickInputMode,
  onQuickInputModeChange,
  quickInputDurations,
  onQuickInputDurationsChange,
}: RequirementsToolbarProps) {
  const updateQuickInputDuration = (
    key: keyof QuickInputDurations,
    value: number
  ) => {
    const limits = QUICK_DURATION_LIMITS[key];
    onQuickInputDurationsChange({
      ...quickInputDurations,
      [key]: clampInteger(
        value,
        limits.min,
        limits.max,
        quickInputDurations[key]
      ),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Учебный план</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Матрица нагрузки: группы x предметы.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-3">
            <Label htmlFor="quick-input-mode" className="text-sm font-medium">
              Режим быстрого ввода
            </Label>
            <Switch
              id="quick-input-mode"
              checked={quickInputMode}
              onCheckedChange={onQuickInputModeChange}
              aria-label="Переключить режим быстрого ввода"
            />
          </div>

          <div
            aria-hidden={!quickInputMode}
            className={cn(
              "overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out",
              quickInputMode
                ? "max-w-96 opacity-100 translate-x-0"
                : "max-w-0 opacity-0 translate-x-2"
            )}
          >
            <div className="flex min-w-max flex-wrap items-center gap-2">
              <Label
                htmlFor="quick-input-duration"
                className="text-xs text-muted-foreground"
              >
                Урок
              </Label>
              <Input
                id="quick-input-duration"
                type="number"
                min={QUICK_DURATION_LIMITS.durationInMinutes.min}
                max={QUICK_DURATION_LIMITS.durationInMinutes.max}
                step={1}
                value={quickInputDurations.durationInMinutes}
                onChange={(event) =>
                  updateQuickInputDuration(
                    "durationInMinutes",
                    event.target.valueAsNumber
                  )
                }
                disabled={!quickInputMode}
                className="h-8 w-20"
                aria-label="Длительность урока для быстрого ввода"
              />

              <Label
                htmlFor="quick-input-break"
                className="text-xs text-muted-foreground"
              >
                Перемена
              </Label>
              <Input
                id="quick-input-break"
                type="number"
                min={QUICK_DURATION_LIMITS.breakDuration.min}
                max={QUICK_DURATION_LIMITS.breakDuration.max}
                step={1}
                value={quickInputDurations.breakDuration}
                onChange={(event) =>
                  updateQuickInputDuration(
                    "breakDuration",
                    event.target.valueAsNumber
                  )
                }
                disabled={!quickInputMode}
                className="h-8 w-20"
                aria-label="Длительность перемены для быстрого ввода"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
