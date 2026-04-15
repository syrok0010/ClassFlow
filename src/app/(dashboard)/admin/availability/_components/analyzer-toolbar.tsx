"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { getWeekRangeLabel } from "../_lib/utils";
import { MODE_OPTIONS, type PanelMode } from "./availability-view-helpers";

type AnalyzerToolbarProps = {
  weekStart: string;
  mode: PanelMode;
  canEdit: boolean;
  isWeekLoading: boolean;
  onModeChange: (value: PanelMode) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
};

export function AnalyzerToolbar({
  weekStart,
  mode,
  canEdit,
  isWeekLoading,
  onModeChange,
  onPreviousWeek,
  onNextWeek,
}: AnalyzerToolbarProps) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={onPreviousWeek} disabled={isWeekLoading}>
            <ChevronLeft />
          </Button>
          <div className="min-w-52 rounded-lg border bg-background px-3 py-2 text-sm font-medium">
            {getWeekRangeLabel(weekStart)}
          </div>
          <Button variant="outline" size="icon-sm" onClick={onNextWeek} disabled={isWeekLoading}>
            <ChevronRight />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {isWeekLoading ? (
            <div className="text-sm text-muted-foreground">Обновляю неделю…</div>
          ) : null}

          <SegmentedControl
            value={mode}
            onChange={(value) => onModeChange(value as PanelMode)}
            options={MODE_OPTIONS.map((option) => ({
              ...option,
              disabled: option.value === "edit" && !canEdit,
            }))}
          />
        </div>
      </CardContent>
    </Card>
  );
}
