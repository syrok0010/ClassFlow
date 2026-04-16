"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getWeekRangeLabel } from "../_lib/utils";

type AnalyzerToolbarProps = {
  weekStart: string;
  isWeekLoading: boolean;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
};

export function AnalyzerToolbar({
  weekStart,
  isWeekLoading,
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
        </div>
      </CardContent>
    </Card>
  );
}
