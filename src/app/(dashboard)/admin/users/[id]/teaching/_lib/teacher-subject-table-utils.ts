import type {
  TeacherSubjectFilterType,
  TeacherSubjectRow,
  TeacherSubjectSummary,
} from "./types";

type TableState = {
  search: string;
  typeFilter: TeacherSubjectFilterType;
};

export function filterAndSortTeacherSubjects(
  rows: TeacherSubjectRow[],
  state: TableState
): TeacherSubjectRow[] {
  const search = state.search.trim().toLowerCase();

  const filtered = rows.filter((row) => {
    const matchesType = state.typeFilter === "ALL" || row.subjectType === state.typeFilter;
    const matchesSearch = !search || row.subjectName.toLowerCase().includes(search);

    return matchesType && matchesSearch;
  });

  return [...filtered].sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName, "ru", { sensitivity: "base" })
  );
}

export function getTeacherSubjectsSummary(rows: TeacherSubjectRow[]): TeacherSubjectSummary {
  const summary: TeacherSubjectSummary = {
    total: rows.length,
    academic: 0,
    electiveRequired: 0,
    electiveOptional: 0,
    regime: 0,
    minCoveredGrade: null,
    maxCoveredGrade: null,
  };

  for (const row of rows) {
    if (row.subjectType === "ACADEMIC") {
      summary.academic += 1;
    } else if (row.subjectType === "ELECTIVE_REQUIRED") {
      summary.electiveRequired += 1;
    } else if (row.subjectType === "ELECTIVE_OPTIONAL") {
      summary.electiveOptional += 1;
    } else if (row.subjectType === "REGIME") {
      summary.regime += 1;
    }

    if (row.minGrade !== null) {
      summary.minCoveredGrade =
        summary.minCoveredGrade === null
          ? row.minGrade
          : Math.min(summary.minCoveredGrade, row.minGrade);
    }

    if (row.maxGrade !== null) {
      summary.maxCoveredGrade =
        summary.maxCoveredGrade === null
          ? row.maxGrade
          : Math.max(summary.maxCoveredGrade, row.maxGrade);
    }
  }

  return summary;
}
