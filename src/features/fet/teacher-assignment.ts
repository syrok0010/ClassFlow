import { getSubgroupBundleKey, shouldSkipWholeClassRequirement } from "./subgroup-rules";
import type { FetInput, FetRequirement, FetTeacherSubject } from "./types";

function canTeach(teacherSubject: FetTeacherSubject, requirement: FetRequirement): boolean {
  if (teacherSubject.subjectId !== requirement.subjectId) return false;

  const grade = requirement.group.grade;
  if (grade === null) return true;
  if (teacherSubject.minGrade !== null && grade < teacherSubject.minGrade) return false;
  if (teacherSubject.maxGrade !== null && grade > teacherSubject.maxGrade) return false;

  return true;
}

function getCandidates(input: FetInput, requirement: FetRequirement): string[] {
  return input.teacherSubjects
    .filter((teacherSubject) => canTeach(teacherSubject, requirement))
    .map((teacherSubject) => teacherSubject.teacherId)
    .sort();
}

export function assignTeachers(input: FetInput): Map<string, string> {
  const assignments = new Map<string, string>();
  const reusableByGradeSubject = new Map<string, string>();
  const subgroupTeacherAssignments = assignSubgroupTeachers(input);

  for (const requirement of input.lessonRequirements) {
    if (requirement.lessonsPerWeek === 0) continue;
    if (shouldSkipWholeClassRequirement(input, requirement)) continue;

    const assignmentKey = `${requirement.groupId}:${requirement.subjectId}`;
    if (assignments.has(assignmentKey)) continue;

    const candidates = getCandidates(input, requirement);
    if (candidates.length === 0) {
      throw new Error(
        `Для "${requirement.group.name} / ${requirement.subject.name}" не найден подходящий преподаватель`,
      );
    }

    const subgroupBundleKey = getSubgroupBundleKey(requirement.group, requirement.subjectId);
    const teacherId = subgroupBundleKey
      ? subgroupTeacherAssignments.get(assignmentKey) ?? failMissingDistinctSubgroupTeacher(requirement)
      : assignReusableTeacher(reusableByGradeSubject, candidates, requirement);

    assignments.set(assignmentKey, teacherId);
  }

  return assignments;
}

function assignSubgroupTeachers(input: FetInput): Map<string, string> {
  const requirementsByBundle = new Map<string, FetRequirement[]>();

  for (const requirement of input.lessonRequirements) {
    if (requirement.lessonsPerWeek === 0) continue;
    if (shouldSkipWholeClassRequirement(input, requirement)) continue;

    const subgroupBundleKey = getSubgroupBundleKey(requirement.group, requirement.subjectId);
    if (!subgroupBundleKey) continue;

    const assignmentKey = `${requirement.groupId}:${requirement.subjectId}`;
    const current = requirementsByBundle.get(subgroupBundleKey) ?? [];
    if (!current.some((candidate) => `${candidate.groupId}:${candidate.subjectId}` === assignmentKey)) {
      current.push(requirement);
    }
    requirementsByBundle.set(subgroupBundleKey, current);
  }

  const assignments = new Map<string, string>();

  for (const requirements of requirementsByBundle.values()) {
    const bundleAssignments = matchDistinctTeachers(input, requirements);
    if (!bundleAssignments) {
      failMissingDistinctSubgroupTeacher(requirements[0]);
    }

    for (const [assignmentKey, teacherId] of bundleAssignments) {
      assignments.set(assignmentKey, teacherId);
    }
  }

  return assignments;
}

function assignReusableTeacher(
  reusableByGradeSubject: Map<string, string>,
  candidates: string[],
  requirement: FetRequirement,
): string {
  const reuseKey = `${requirement.group.grade ?? "no-grade"}:${requirement.subjectId}`;
  const reusableTeacherId = reusableByGradeSubject.get(reuseKey);
  const teacherId = reusableTeacherId && candidates.includes(reusableTeacherId)
    ? reusableTeacherId
    : candidates[0];

  reusableByGradeSubject.set(reuseKey, teacherId);

  return teacherId;
}

function matchDistinctTeachers(
  input: FetInput,
  requirements: FetRequirement[],
): Map<string, string> | null {
  const orderedRequirements = [...requirements].sort((left, right) => {
    const candidatesDiff = getCandidates(input, left).length - getCandidates(input, right).length;
    if (candidatesDiff !== 0) return candidatesDiff;
    return `${left.groupId}:${left.subjectId}`.localeCompare(`${right.groupId}:${right.subjectId}`);
  });

  const assignments = new Map<string, string>();
  const usedTeacherIds = new Set<string>();

  function assign(index: number): boolean {
    if (index >= orderedRequirements.length) return true;

    const requirement = orderedRequirements[index];
    const assignmentKey = `${requirement.groupId}:${requirement.subjectId}`;

    for (const teacherId of getCandidates(input, requirement)) {
      if (usedTeacherIds.has(teacherId)) continue;

      usedTeacherIds.add(teacherId);
      assignments.set(assignmentKey, teacherId);

      if (assign(index + 1)) return true;

      assignments.delete(assignmentKey);
      usedTeacherIds.delete(teacherId);
    }

    return false;
  }

  return assign(0) ? assignments : null;
}

function failMissingDistinctSubgroupTeacher(requirement: FetRequirement): never {
  throw new Error(
    `Для подгрупп "${requirement.group.name} / ${requirement.subject.name}" не хватает разных преподавателей`,
  );
}
