import { getAllScheduleSlots, getCompatibleRoomIds, getOrdinarySubjectWindow } from "./activity-utils";
import { FET_CORE_WINDOW_WEIGHT } from "./env";
import { assignTeachers } from "./teacher-assignment";
import type { FetActivity, FetImportedActivity, FetInput } from "./types";

export function buildLockedRegimeActivities(
  input: FetInput,
  regimeActivities: FetActivity[],
  importedRegime: FetImportedActivity[],
): FetActivity[] {
  const importedById = new Map(importedRegime.map((activity) => [activity.activityId, activity]));

  return regimeActivities.map((activity) => {
    const imported = importedById.get(activity.id);
    if (!imported) {
      throw new Error(`FET не вернул режимную activity ${activity.id}`);
    }

    return {
      ...activity,
      source: "LOCKED_REGIME",
      allowedSlots: [{ dayOfWeek: imported.dayOfWeek, startTime: imported.startTime }],
      fixedSlot: { dayOfWeek: imported.dayOfWeek, startTime: imported.startTime },
      fixedRoomId: imported.roomId,
    };
  });
}

export function buildFullActivities(
  input: FetInput,
  lockedRegimeActivities: FetActivity[],
): { activities: FetActivity[]; ordinaryActivityCount: number } {
  const activities: FetActivity[] = [...lockedRegimeActivities];
  const teacherAssignments = assignTeachers(input);
  let nextId = activities.reduce((maxId, activity) => Math.max(maxId, activity.id), 0) + 1;
  let ordinaryActivityCount = 0;

  for (const requirement of input.lessonRequirements) {
    const teacherId = teacherAssignments.get(`${requirement.groupId}:${requirement.subjectId}`);
    if (!teacherId && requirement.lessonsPerWeek > 0) {
      throw new Error(
        `Для "${requirement.group.name} / ${requirement.subject.name}" не найден подходящий преподаватель`,
      );
    }

    for (let index = 0; index < requirement.lessonsPerWeek; index += 1) {
      activities.push({
        id: nextId,
        source: "ORDINARY",
        groupId: requirement.groupId,
        subjectId: requirement.subjectId,
        teacherId: teacherId ?? null,
        durationInMinutes: requirement.durationInMinutes,
        allowedSlots: getAllScheduleSlots(
          requirement.durationInMinutes,
          getOrdinarySubjectWindow(requirement.subject.type),
        ),
        timeConstraintWeight: FET_CORE_WINDOW_WEIGHT,
        roomIds: getCompatibleRoomIds(input, requirement.subjectId),
      });
      nextId += 1;
      ordinaryActivityCount += 1;
    }
  }

  return { activities, ordinaryActivityCount };
}
