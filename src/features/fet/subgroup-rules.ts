import type { FetActivity, FetGroup, FetInput, FetRequirement } from "./types";

export function getSubjectSubgroupKeys(input: FetInput): Set<string> {
  const keys = new Set<string>();

  for (const group of input.groups) {
    if (group.type !== "SUBJECT_SUBGROUP" || !group.parentId || !group.subjectId) continue;
    keys.add(getParentSubjectKey(group.parentId, group.subjectId));
  }

  for (const requirement of input.lessonRequirements) {
    if (requirement.group.type !== "SUBJECT_SUBGROUP" || !requirement.group.parentId) continue;
    keys.add(getParentSubjectKey(requirement.group.parentId, requirement.subjectId));
  }

  return keys;
}

export function shouldSkipWholeClassRequirement(
  input: FetInput,
  requirement: FetRequirement,
): boolean {
  if (requirement.group.type !== "CLASS") return false;
  return getSubjectSubgroupKeys(input).has(getParentSubjectKey(requirement.groupId, requirement.subjectId));
}

export function getSubgroupBundleKey(group: FetGroup, subjectId: string): string | null {
  if (group.type !== "SUBJECT_SUBGROUP" || !group.parentId) return null;
  return getParentSubjectKey(group.parentId, subjectId);
}

export function getActivitySubgroupBundleKey(
  input: FetInput,
  activity: FetActivity,
): string | null {
  const group = input.groups.find((candidate) => candidate.id === activity.groupId);
  if (!group) return null;

  return getSubgroupBundleKey(group, activity.subjectId);
}

function getParentSubjectKey(parentGroupId: string, subjectId: string): string {
  return `${parentGroupId}:${subjectId}`;
}
