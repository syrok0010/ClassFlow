import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getWeekRangeLabel } from "../_lib/utils";

type AnalyzerToolbarProps = {
  weekStart: Date;
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
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button variant="outline" size="icon-sm" onClick={onPreviousWeek} disabled={isWeekLoading}>
        <ChevronLeft />
      </Button>
      <div className="relative min-w-52">
        <div className="rounded-lg border bg-background px-3 py-2 text-center text-base font-medium">
          {getWeekRangeLabel(weekStart)}
        </div>
        {isWeekLoading ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
              <Spinner className="text-muted-foreground" />
            </div>
        ) : null}
      </div>
      <Button variant="outline" size="icon-sm" onClick={onNextWeek} disabled={isWeekLoading}>
        <ChevronRight />
      </Button>
    </div>
  );
}
