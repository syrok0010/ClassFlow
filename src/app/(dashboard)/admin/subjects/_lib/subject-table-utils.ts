import type { SubjectType } from "@/generated/prisma/client";
import { SUBJECT_SELECT } from "@/lib/constants";
import type {SubjectFilterType, SubjectWithUsage} from "./types";

type TableState = {
  search: string;
  typeFilter: SubjectFilterType;
};

export function filterAndSortSubjects(
  subjects: SubjectWithUsage[],
  state: TableState
): SubjectWithUsage[] {
  const search = state.search.trim().toLowerCase();

  const filtered = subjects.filter((subject) => {
    const matchesType = state.typeFilter === "ALL" || subject.type === state.typeFilter;
    const matchesSearch = !search || subject.name.toLowerCase().includes(search);

    return matchesType && matchesSearch;
  });

  return [...filtered].sort((a, b) =>
      a.name.localeCompare(b.name, "ru", {sensitivity: "base"})
  );
}

export function groupSubjectsByType(subjects: SubjectWithUsage[]) {
  const grouped = new Map<SubjectType, SubjectWithUsage[]>();

  for (const type of SUBJECT_SELECT) {
    grouped.set(type, []);
  }

  for (const subject of subjects) {
    grouped.get(subject.type)?.push(subject);
  }

  return grouped;
}
