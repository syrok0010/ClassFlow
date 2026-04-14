import type { TeacherSubjectSummary } from "../lib/types";

interface TeacherSubjectsSummaryProps {
  summary: TeacherSubjectSummary;
}

export function TeacherSubjectsSummary({ summary }: TeacherSubjectsSummaryProps) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>
          <span className="text-muted-foreground">Всего предметов:</span> {summary.total}
        </span>
        <span>
          <span className="text-muted-foreground">Основные:</span> {summary.academic}
        </span>
        <span>
          <span className="text-muted-foreground">Доп. обязательные:</span> {summary.electiveRequired}
        </span>
        <span>
          <span className="text-muted-foreground">Доп. по выбору:</span> {summary.electiveOptional}
        </span>
        <span>
          <span className="text-muted-foreground">Режимные:</span> {summary.regime}
        </span>
      </div>
    </div>
  );
}
