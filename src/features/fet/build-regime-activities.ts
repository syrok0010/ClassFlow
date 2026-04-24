import { getCompatibleRoomIds, getWindowSlots } from "./activity-utils";
import { getRegimeConstraintRule } from "./regime-constraints";
import type { FetActivity, FetInput } from "./types";

export function buildRegimeActivities(input: FetInput, firstActivityId = 1): FetActivity[] {
  const activities: FetActivity[] = [];
  let nextId = firstActivityId;

  for (const requirement of input.regimeRequirements) {
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
        source: "REGIME",
        groupId: requirement.groupId,
        subjectId: requirement.subjectId,
        teacherId: null,
        durationInMinutes: requirement.durationInMinutes,
        allowedSlots: getWindowSlots([window], requirement.durationInMinutes),
        roomIds,
      });
      nextId += 1;
    }
  }

  return activities;
}
