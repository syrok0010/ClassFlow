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

  for (const requirement of input.lessonRequirements) {
    if (requirement.lessonsPerWeek === 0) continue;

    const assignmentKey = `${requirement.groupId}:${requirement.subjectId}`;
    if (assignments.has(assignmentKey)) continue;

    const candidates = getCandidates(input, requirement);
    if (candidates.length === 0) {
      throw new Error(
        `Для "${requirement.group.name} / ${requirement.subject.name}" не найден подходящий преподаватель`,
      );
    }

    const reuseKey = `${requirement.group.grade ?? "no-grade"}:${requirement.subjectId}`;
    const reusableTeacherId = reusableByGradeSubject.get(reuseKey);
    const teacherId = reusableTeacherId && candidates.includes(reusableTeacherId)
      ? reusableTeacherId
      : candidates[0];

    assignments.set(assignmentKey, teacherId);
    reusableByGradeSubject.set(reuseKey, teacherId);
  }

  return assignments;
}
