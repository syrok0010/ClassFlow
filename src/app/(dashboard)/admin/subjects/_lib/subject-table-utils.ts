import type {SubjectType} from "@/generated/prisma/client";
import {SUBJECT_TYPE_ORDER} from "./constants";
import type {SubjectWithUsage} from "./types";

type TableState = {
  search: string;
  typeFilter: "all" | SubjectType;
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

  return [...filtered].sort((a, b) =>
      a.name.localeCompare(b.name, "ru", {sensitivity: "base"})
  );
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
