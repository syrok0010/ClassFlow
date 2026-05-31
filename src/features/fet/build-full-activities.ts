import {
  getAllScheduleSlots,
  getCompatibleRoomIdsForAudience,
  getExpectedAudienceSize,
  getOrdinarySubjectWindow,
} from "./activity-utils";
import { assignTeachers } from "./teacher-assignment";
import type { FetActivity, FetImportedActivity, FetInput, FetRequirement } from "./types";

function getRequirementAudienceSize(input: FetInput, requirement: FetRequirement): number {
  const groupsById = new Map(input.groups.map((group) => [group.id, group]));
  const group = groupsById.get(requirement.groupId) ?? requirement.group;
  const parentGroup = group.parentId ? groupsById.get(group.parentId) : null;
  const deliveryGroupSize = group.studentCount ?? 0;
  const classSize = parentGroup?.studentCount ?? deliveryGroupSize;
  const loadMode = requirement.subject.defaultAttendanceLoadMode ?? "DELIVERY_GROUP_SIZE";

  return getExpectedAudienceSize([classSize], deliveryGroupSize, loadMode);
}

function getDeliveryFields(input: FetInput, requirement: FetRequirement) {
  if (requirement.group.type === "ELECTIVE_GROUP") {
    return {
      deliveryMode: "ELECTIVE_GROUP" as const,
      deliveryGroupId: requirement.groupId,
      openClassIds: input.electiveGroupOpenClassIdsByGroupId?.[requirement.groupId] ?? [],
      coveredClassIds: [],
    };
  }

  return {
    deliveryMode: "DIRECT_GROUP" as const,
    deliveryGroupId: requirement.groupId,
    openClassIds: [],
    coveredClassIds: [],
  };
}

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
      const expectedAudienceSize = getRequirementAudienceSize(input, requirement);
      const roomIds = getCompatibleRoomIdsForAudience(input, requirement.subjectId, expectedAudienceSize);
      const deliveryFields = getDeliveryFields(input, requirement);

      activities.push({
        id: nextId,
        source: "ORDINARY",
        groupId: requirement.groupId,
        studentSetIds: [requirement.groupId],
        subjectId: requirement.subjectId,
        teacherId: teacherId ?? null,
        durationInMinutes: requirement.durationInMinutes,
        allowedSlots: getAllScheduleSlots(
          requirement.durationInMinutes,
          getOrdinarySubjectWindow(requirement.subject.type),
        ),
        timeConstraintWeight: 100,
        roomIds,
        ...deliveryFields,
        attendanceLoadModeOverride: null,
        expectedAudienceSize,
      });
      nextId += 1;
      ordinaryActivityCount += 1;
    }
  }

  return { activities, ordinaryActivityCount };
}
