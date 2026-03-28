import { Button } from "@/components/ui/button";
import type { SubjectUsage } from "../_lib/types";

interface SubjectUsageCellProps {
  usage: SubjectUsage;
}

function formatUsageLines(usage: SubjectUsage): string[] {
  const lines = [
    `Кабинеты: ${usage.roomsCount}`,
    `Требования: ${usage.requirementsCount}`,
    `Учителя: ${usage.teachersCount}`,
  ];

  if (usage.scheduleTemplatesCount > 0) {
    lines.push(`Шаблоны расписания: ${usage.scheduleTemplatesCount}`);
  }

  if (usage.scheduleEntriesCount > 0) {
    lines.push(`Записи расписания: ${usage.scheduleEntriesCount}`);
  }

  return lines;
}

export function SubjectUsageCell({ usage }: SubjectUsageCellProps) {
  const total =
    usage.roomsCount +
    usage.requirementsCount +
    usage.teachersCount +
    usage.scheduleTemplatesCount +
    usage.scheduleEntriesCount;

  if (total === 0) {
    return <span className="text-sm text-muted-foreground">Не используется</span>;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto justify-start p-0 text-left text-sm font-normal"
      title={formatUsageLines(usage).join("\n")}
    >
      <span className="text-muted-foreground">
        Кабинеты: {usage.roomsCount} · Требования: {usage.requirementsCount} · Учителя: {usage.teachersCount}
      </span>
    </Button>
  );
}
