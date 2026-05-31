import { getAllScheduleSlots, getCompatibleRoomIds, getOrdinarySubjectWindow, getWindowSlots } from "./activity-utils";
import { FET_CORE_WINDOW_WEIGHT, getFetBreakAfterMinutes } from "./env";
import { getRegimeConstraintRule } from "./regime-constraints";
import { shouldSkipWholeClassRequirement } from "./subgroup-rules";
import { assignTeachers } from "./teacher-assignment";
import type { FetActivity, FetInput } from "./types";

const CORE_REGIME_SUBJECT_NAMES = new Set(["Завтрак", "Обед"]);
const SKIPPED_REGIME_SUBJECT_NAMES = new Set(["Полдник"]);

export function isCoreRegimeSubject(subjectName: string): boolean {
  return CORE_REGIME_SUBJECT_NAMES.has(subjectName);
}

export function isSkippedRegimeSubject(subjectName: string): boolean {
  return SKIPPED_REGIME_SUBJECT_NAMES.has(subjectName);
}

export function buildCoreActivities(input: FetInput, firstActivityId = 1): FetActivity[] {
  const activities: FetActivity[] = [];
  const teacherAssignments = assignTeachers(input);
  let nextId = firstActivityId;

  for (const requirement of input.lessonRequirements) {
    if (shouldSkipWholeClassRequirement(input, requirement)) continue;
    if (requirement.subject.type !== "ACADEMIC") continue;

    const teacherId = teacherAssignments.get(`${requirement.groupId}:${requirement.subjectId}`);
    if (!teacherId && requirement.lessonsPerWeek > 0) {
      throw new Error(
        `Для "${requirement.group.name} / ${requirement.subject.name}" не найден подходящий преподаватель`,
      );
    }

    for (let index = 0; index < requirement.lessonsPerWeek; index += 1) {
      activities.push({
        id: nextId,
        source: "CORE",
        groupId: requirement.groupId,
        subjectId: requirement.subjectId,
        teacherId: teacherId ?? null,
        durationInMinutes: requirement.durationInMinutes,
        breakAfterMinutes: getFetBreakAfterMinutes(requirement.breakDuration),
        allowedSlots: getAllScheduleSlots(
          requirement.durationInMinutes,
          getOrdinarySubjectWindow(requirement.subject.type),
        ),
        timeConstraintWeight: FET_CORE_WINDOW_WEIGHT,
        roomIds: getCompatibleRoomIds(input, requirement.subjectId),
      });
      nextId += 1;
    }
  }

  for (const requirement of input.regimeRequirements) {
    if (!isCoreRegimeSubject(requirement.subject.name)) continue;

    const rule = getRegimeConstraintRule(requirement.subject.name);
    if (!rule) {
      throw new Error(`Для режимного предмета "${requirement.subject.name}" не задано временное окно генерации`);
    }

    const windowsByDay = [...rule.allowedWindowsByDay].sort((left, right) => left.dayOfWeek - right.dayOfWeek);
    const selectedWindows = windowsByDay.slice(0, requirement.lessonsPerWeek);
    const roomIds = getCompatibleRoomIds(input, requirement.subjectId);

    for (const window of selectedWindows) {
      activities.push({
        id: nextId,
        source: "CORE",
        groupId: requirement.groupId,
        subjectId: requirement.subjectId,
        teacherId: null,
        durationInMinutes: requirement.durationInMinutes,
        breakAfterMinutes: getFetBreakAfterMinutes(requirement.breakDuration),
        allowedSlots: getWindowSlots([window], requirement.durationInMinutes),
        roomIds,
      });
      nextId += 1;
    }
  }

  return activities;
}
