import type { SubjectType } from "@/generated/prisma/client";
import { SUBJECT_TYPE_TO_GROUP } from "./constants";
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
    const rowGroup = SUBJECT_TYPE_TO_GROUP[row.subjectType as SubjectType];
    const matchesType = state.typeFilter === "ALL" || rowGroup === state.typeFilter;
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
    elective: 0,
    regime: 0,
    minCoveredGrade: null,
    maxCoveredGrade: null,
  };

  for (const row of rows) {
    const group = SUBJECT_TYPE_TO_GROUP[row.subjectType as SubjectType];
    if (group === "ACADEMIC") {
      summary.academic += 1;
    } else if (group === "ELECTIVE") {
      summary.elective += 1;
    } else if (group === "REGIME") {
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
