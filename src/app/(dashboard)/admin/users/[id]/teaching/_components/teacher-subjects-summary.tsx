import type { TeacherSubjectSummary } from "../_lib/types";

interface TeacherSubjectsSummaryProps {
  summary: TeacherSubjectSummary;
}

function formatCoverage(summary: TeacherSubjectSummary): string {
  if (summary.minCoveredGrade === null || summary.maxCoveredGrade === null) {
    return "-";
  }

  return `${summary.minCoveredGrade}-${summary.maxCoveredGrade} классы`;
}

export function TeacherSubjectsSummary({ summary }: TeacherSubjectsSummaryProps) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 text-sm text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>
          <span className="text-muted-foreground">Всего предметов:</span> {summary.total}
        </span>
        <span>
          <span className="text-muted-foreground">Academic:</span> {summary.academic}
        </span>
        <span>
          <span className="text-muted-foreground">Elective required:</span> {summary.electiveRequired}
        </span>
        <span>
          <span className="text-muted-foreground">Elective optional:</span> {summary.electiveOptional}
        </span>
        <span>
          <span className="text-muted-foreground">Regime:</span> {summary.regime}
        </span>
        <span>
          <span className="text-muted-foreground">Диапазон покрытия:</span> {formatCoverage(summary)}
        </span>
      </div>
    </div>
  );
}
