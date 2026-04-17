"use client";

import type { SlotBreakdown } from "../_lib/types";

type MultiTeacherTooltipContentProps = {
  dayLabel: string;
  dateLabel: string;
  minuteLabel: string;
  breakdown: SlotBreakdown;
};

export function MultiTeacherTooltipContent({
  dayLabel,
  dateLabel,
  minuteLabel,
  breakdown,
}: MultiTeacherTooltipContentProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-medium text-foreground">
        {dayLabel}, {dateLabel} · {minuteLabel}
      </div>
      <div className="flex flex-col gap-2">
        <TooltipGroup
          title={`Доступны (${breakdown.available.length})`}
          tone="text-emerald-700"
          items={breakdown.available.map((entry) => entry.teacherName)}
        />
        <TooltipGroup
          title={`Недоступны (${breakdown.unavailable.length})`}
          tone="text-destructive"
          items={breakdown.unavailable.map((entry) => entry.teacherName)}
        />
        <TooltipGroup
          title={`Не отмечены (${breakdown.unmarked.length})`}
          tone="text-muted-foreground"
          items={breakdown.unmarked.map((entry) => entry.teacherName)}
        />
      </div>
    </div>
  );
}

function TooltipGroup({
  title,
  tone,
  items,
}: {
  title: string;
  tone: string;
  items: string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className={`font-medium ${tone}`}>{title}</p>
      {items.length > 0 ? (
        <p className="text-muted-foreground">{items.join(", ")}</p>
      ) : (
        <p className="text-muted-foreground">Нет</p>
      )}
    </div>
  );
}
