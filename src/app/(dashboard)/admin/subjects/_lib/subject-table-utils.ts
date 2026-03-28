import type { SubjectType } from "@/generated/prisma/client";
import { SUBJECT_TYPE_ORDER, type SubjectSortKey } from "./constants";
import type { SubjectWithUsage } from "./types";

type TableState = {
  search: string;
  typeFilter: "all" | SubjectType;
  sort: SubjectSortKey;
};

export function filterAndSortSubjects(
  subjects: SubjectWithUsage[],
  state: TableState
): SubjectWithUsage[] {
  const search = state.search.trim().toLowerCase();

  const filtered = subjects.filter((subject) => {
    const matchesType = state.typeFilter === "all" || subject.type === state.typeFilter;
    const matchesSearch = !search || subject.name.toLowerCase().includes(search);

    return matchesType && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (state.sort === "type") {
      const typeDelta =
        SUBJECT_TYPE_ORDER.indexOf(a.type) - SUBJECT_TYPE_ORDER.indexOf(b.type);

      if (typeDelta !== 0) {
        return typeDelta;
      }
    }

    return a.name.localeCompare(b.name, "ru", { sensitivity: "base" });
  });

  return sorted;
}

export function groupSubjectsByType(subjects: SubjectWithUsage[]) {
  const grouped = new Map<SubjectType, SubjectWithUsage[]>();

  for (const type of SUBJECT_TYPE_ORDER) {
    grouped.set(type, []);
  }

  for (const subject of subjects) {
    grouped.get(subject.type)?.push(subject);
  }

  return grouped;
}
