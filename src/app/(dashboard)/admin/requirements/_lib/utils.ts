import { SUBJECT_COLUMN_GROUPS } from "./constants";
import type {
  RequirementEntry,
  RequirementSubject,
  SubjectColumnGroupKey,
} from "./types";

export function makeRequirementMap(entries: RequirementEntry[]): Map<string, RequirementEntry> {
  return new Map(entries.map((entry) => [`${entry.groupId}:${entry.subjectId}`, entry]));
}

export function groupSubjectsByColumnType(subjects: RequirementSubject[]): Map<SubjectColumnGroupKey, RequirementSubject[]> {
  const initial = new Map<SubjectColumnGroupKey, RequirementSubject[]>(
    SUBJECT_COLUMN_GROUPS.map((group) => [group.key, []])
  );

  for (const subject of subjects) {
    initial.get(subject.type)?.push(subject);
  }

  for (const [key, list] of initial) {
    list.sort((a, b) => a.name.localeCompare(b.name, "ru", { sensitivity: "base" }));
    initial.set(key, list);
  }

  return initial;
}

export function getWeeklyTotalForClassRow(
  rowId: string,
  subjects: RequirementSubject[],
  requirementsMap: Map<string, RequirementEntry>
): number {
  return subjects.reduce((sum, subject) => {
    if (subject.type === "REGIME") {
      return sum;
    }

    const entry = requirementsMap.get(`${rowId}:${subject.id}`);
    return sum + (entry?.lessonsPerWeek ?? 0);
  }, 0);
}
