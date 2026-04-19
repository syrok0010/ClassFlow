import type { GroupType, SubjectType } from "@/generated/prisma/client";
import { SUBJECT_COLUMN_GROUPS } from "./constants";
import type {
  FlatRequirementRow,
  RequirementEntry,
  RequirementGroupNode,
  RequirementSubject,
  SubjectColumnGroupKey,
} from "./types";

export function getFullRowLabel(group: {
  name: string;
  type: GroupType;
  subjectId: string | null;
}, parentName?: string): string {
  if (group.type === "SUBJECT_SUBGROUP" && parentName) {
    return `${parentName} / ${group.name}`;
  }

  return group.name;
}

export function flattenRequirementRows(
  root: RequirementGroupNode[],
  expanded: Set<string>
): FlatRequirementRow[] {
  const rows: FlatRequirementRow[] = [];

  const walk = (nodes: RequirementGroupNode[], depth: number) => {
    for (const node of nodes) {
      const hasChildren = node.subGroups.length > 0;
      const isExpanded = expanded.has(node.id);

      rows.push({
        id: node.id,
        name: node.name,
        type: node.type,
        grade: node.grade,
        parentId: node.parentId,
        subjectId: node.subjectId,
        depth,
        hasChildren,
        isExpanded,
      });

      if (hasChildren && isExpanded) {
        walk(node.subGroups, depth + 1);
      }
    }
  };

  walk(root, 0);
  return rows;
}

export function getRootRowIds(groups: RequirementGroupNode[]): string[] {
  return groups.map((group) => group.id);
}

export function makeRequirementMap(entries: RequirementEntry[]): Map<string, RequirementEntry> {
  return new Map(entries.map((entry) => [`${entry.groupId}:${entry.subjectId}`, entry]));
}

export function groupSubjectsByColumnType(subjects: RequirementSubject[]): Map<SubjectColumnGroupKey, RequirementSubject[]> {
  const initial = new Map<SubjectColumnGroupKey, RequirementSubject[]>(
    SUBJECT_COLUMN_GROUPS.map((group) => [group.key, []])
  );

  for (const subject of subjects) {
    const key = mapSubjectTypeToColumnGroup(subject.type);
    initial.get(key)?.push(subject);
  }

  for (const [key, list] of initial) {
    list.sort((a, b) => a.name.localeCompare(b.name, "ru", { sensitivity: "base" }));
    initial.set(key, list);
  }

  return initial;
}

export function mapSubjectTypeToColumnGroup(type: SubjectType): SubjectColumnGroupKey {
  switch (type) {
    case "REGIME":
      return "REGIME";
    case "ACADEMIC":
      return "ACADEMIC";
    case "ELECTIVE_REQUIRED":
      return "ELECTIVE_REQUIRED";
    case "ELECTIVE_OPTIONAL":
      return "ELECTIVE_OPTIONAL";
    default:
      return "ACADEMIC";
  }
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
