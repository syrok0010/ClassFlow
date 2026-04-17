import type { SubjectFilterType } from "@/lib/types";
import type { TeacherSubjectRow, TeacherSubjectSummary } from "./types";

type TableState = {
  search: string;
  typeFilter: SubjectFilterType;
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
  }

  return summary;
}
