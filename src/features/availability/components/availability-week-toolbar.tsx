import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getWeekRangeLabel } from "@/features/availability/lib/utils";

export function AvailabilityWeekToolbar({
  weekStart,
  isWeekLoading,
  onPreviousWeek,
  onNextWeek,
  previousButtonTestId,
  nextButtonTestId,
  labelMinWidthClassName = "min-w-52",
  className = "flex flex-wrap items-center justify-center gap-3",
}: {
  weekStart: Date;
  isWeekLoading: boolean;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  previousButtonTestId?: string;
  nextButtonTestId?: string;
  labelMinWidthClassName?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onPreviousWeek}
        disabled={isWeekLoading}
        data-testid={previousButtonTestId}
      >
        <ChevronLeft />
      </Button>
      <div className={`relative ${labelMinWidthClassName}`}>
        <div className="rounded-lg border bg-background px-3 py-2 text-center text-base font-medium">
          {getWeekRangeLabel(weekStart)}
        </div>
        {isWeekLoading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
            <Spinner className="text-muted-foreground" />
          </div>
        ) : null}
      </div>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onNextWeek}
        disabled={isWeekLoading}
        data-testid={nextButtonTestId}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
