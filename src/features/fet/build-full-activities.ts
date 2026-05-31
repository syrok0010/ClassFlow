import { getAllScheduleSlots, getCompatibleRoomIds, getOrdinarySubjectWindow, getScheduleSlotsByDay } from "./activity-utils";
import { FET_CORE_WINDOW_WEIGHT, getFetBreakAfterMinutes } from "./env";
import { isCoreRegimeSubject, isSkippedRegimeSubject } from "./build-core-activities";
import { getRegimeConstraintRule } from "./regime-constraints";
import { shouldSkipWholeClassRequirement } from "./subgroup-rules";
import { assignTeachers } from "./teacher-assignment";
import type { FetActivity, FetDayOfWeek, FetImportedActivity, FetInput } from "./types";

export function buildLockedRegimeActivities(
  _input: FetInput,
  regimeActivities: FetActivity[],
  importedRegime: FetImportedActivity[],
): FetActivity[] {
  return buildLockedActivities(regimeActivities, importedRegime, "LOCKED_REGIME");
}

export function buildLockedCoreActivities(
  coreActivities: FetActivity[],
  importedCore: FetImportedActivity[],
): FetActivity[] {
  return buildLockedActivities(coreActivities, importedCore, "LOCKED_CORE");
}

function buildLockedActivities(
  activities: FetActivity[],
  importedActivities: FetImportedActivity[],
  source: "LOCKED_CORE" | "LOCKED_REGIME",
): FetActivity[] {
  const importedById = new Map(importedActivities.map((activity) => [activity.activityId, activity]));

  return activities.map((activity) => {
    const imported = importedById.get(activity.id);
    if (!imported) {
      throw new Error(`FET не вернул режимную activity ${activity.id}`);
    }

    return {
      ...activity,
      source,
      allowedSlots: [{ dayOfWeek: imported.dayOfWeek, startTime: imported.startTime }],
      fixedSlot: { dayOfWeek: imported.dayOfWeek, startTime: imported.startTime },
      fixedRoomId: imported.roomId,
    };
  });
}

export function buildFullActivities(
  input: FetInput,
  lockedActivities: FetActivity[],
): { activities: FetActivity[]; ordinaryActivityCount: number } {
  const activities: FetActivity[] = [...lockedActivities];
  const teacherAssignments = assignTeachers(input);
  let nextId = activities.reduce((maxId, activity) => Math.max(maxId, activity.id), 0) + 1;
  let ordinaryActivityCount = 0;
  const addOnStartByGroupDay = getAddOnStartByGroupDay(input, lockedActivities);
  const lockedCoreMealsByGroupId = getLockedCoreMealActivityIdsByGroupId(input, lockedActivities);

  for (const requirement of input.lessonRequirements) {
    if (shouldSkipWholeClassRequirement(input, requirement)) continue;
    if (requirement.subject.type === "ACADEMIC") continue;

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
        breakAfterMinutes: getFetBreakAfterMinutes(requirement.breakDuration),
        allowedSlots: getAddOnSlots(input, requirement.groupId, requirement.durationInMinutes, requirement.subject.type, addOnStartByGroupDay),
        timeConstraintWeight: FET_CORE_WINDOW_WEIGHT,
        roomIds: getCompatibleRoomIds(input, requirement.subjectId),
        notOverlappingActivityIds: getBlockedCoreMealActivityIds(input, requirement.groupId, lockedCoreMealsByGroupId),
      });
      nextId += 1;
      ordinaryActivityCount += 1;
    }
  }

  for (const requirement of input.regimeRequirements) {
    if (isCoreRegimeSubject(requirement.subject.name)) continue;
    if (isSkippedRegimeSubject(requirement.subject.name)) continue;

    const roomIds = getCompatibleRoomIds(input, requirement.subjectId);
    const rule = getRegimeConstraintRule(requirement.subject.name);
    if (!rule) {
      throw new Error(`Для режимного предмета "${requirement.subject.name}" не задано временное окно генерации`);
    }
    const windowsByDay = [...rule.allowedWindowsByDay].sort((left, right) => left.dayOfWeek - right.dayOfWeek);
    const selectedWindows = windowsByDay.slice(0, requirement.lessonsPerWeek);

    for (const window of selectedWindows) {
      activities.push({
        id: nextId,
        source: "ORDINARY",
        groupId: requirement.groupId,
        subjectId: requirement.subjectId,
        teacherId: null,
        durationInMinutes: requirement.durationInMinutes,
        breakAfterMinutes: getFetBreakAfterMinutes(requirement.breakDuration),
        allowedSlots: getScheduleSlotsByDay(
          requirement.durationInMinutes,
          new Map([[window.dayOfWeek, {
            startTime: Math.max(
              window.startTime,
              getAddOnStartForDay(input, requirement.groupId, window.dayOfWeek, addOnStartByGroupDay) ?? window.startTime,
            ),
            endTime: window.endTime,
          }]]),
        ),
        roomIds,
        notOverlappingActivityIds: getBlockedCoreMealActivityIds(input, requirement.groupId, lockedCoreMealsByGroupId),
      });
      nextId += 1;
      ordinaryActivityCount += 1;
    }
  }

  assertActivitiesHaveAllowedSlots(input, activities);

  return { activities, ordinaryActivityCount };
}

function getAddOnStartByGroupDay(input: FetInput, lockedActivities: FetActivity[]) {
  const subjectsById = new Map(input.subjects.map((subject) => [subject.id, subject]));
  const groupsById = new Map(input.groups.map((group) => [group.id, group]));
  const startByGroupDay = new Map<string, number>();

  for (const activity of lockedActivities) {
    const subject = subjectsById.get(activity.subjectId);
    if (subject?.type !== "ACADEMIC" || !activity.fixedSlot) continue;

    const endTime = activity.fixedSlot.startTime + activity.durationInMinutes;
    setMaxStart(startByGroupDay, activity.groupId, activity.fixedSlot.dayOfWeek, endTime);

    const group = groupsById.get(activity.groupId);
    if (group?.parentId) {
      setMaxStart(startByGroupDay, group.parentId, activity.fixedSlot.dayOfWeek, endTime);
    }
  }

  return startByGroupDay;
}

function getAddOnSlots(
  input: FetInput,
  groupId: string,
  durationInMinutes: number,
  subjectType: Parameters<typeof getOrdinarySubjectWindow>[0],
  addOnStartByGroupDay: Map<string, number>,
) {
  if (subjectType === "REGIME") {
    return getAllScheduleSlots(durationInMinutes);
  }

  const defaultWindow = getOrdinarySubjectWindow(subjectType);
  const windowsByDay = new Map<FetDayOfWeek, { startTime: number; endTime: number }>();

  for (const dayOfWeek of [1, 2, 3, 4, 5] as FetDayOfWeek[]) {
    windowsByDay.set(dayOfWeek, {
      startTime: Math.max(
        defaultWindow.startTime,
        getAddOnStartForDay(input, groupId, dayOfWeek, addOnStartByGroupDay) ?? defaultWindow.startTime,
      ),
      endTime: defaultWindow.endTime,
    });
  }

  return getScheduleSlotsByDay(durationInMinutes, windowsByDay);
}

function getGroupDayKey(groupId: string, dayOfWeek: FetDayOfWeek) {
  return `${groupId}:${dayOfWeek}`;
}

function setMaxStart(
  startByGroupDay: Map<string, number>,
  groupId: string,
  dayOfWeek: FetDayOfWeek,
  endTime: number,
) {
  const key = getGroupDayKey(groupId, dayOfWeek);
  const current = startByGroupDay.get(key) ?? 0;
  startByGroupDay.set(key, Math.max(current, endTime));
}

function getAddOnAudienceGroupIds(input: FetInput, groupId: string): string[] {
  const group = input.groups.find((candidate) => candidate.id === groupId);
  if (!group) return [groupId];

  if (group.type === "ELECTIVE_GROUP") {
    const openClassIds = input.electiveGroupClassLinks
      .filter((link) => link.electiveGroupId === groupId)
      .map((link) => link.classGroupId);

    return openClassIds.length > 0 ? openClassIds : [groupId];
  }

  if (group.parentId) {
    return [groupId, group.parentId];
  }

  return [groupId];
}

function getAddOnStartForDay(
  input: FetInput,
  groupId: string,
  dayOfWeek: FetDayOfWeek,
  addOnStartByGroupDay: Map<string, number>,
) {
  return getAddOnStartForDayFromGroupIds(
    getAddOnAudienceGroupIds(input, groupId),
    dayOfWeek,
    addOnStartByGroupDay,
  );
}

function getAddOnStartForDayFromGroupIds(
  groupIds: string[],
  dayOfWeek: FetDayOfWeek,
  addOnStartByGroupDay: Map<string, number>,
) {
  let startTime: number | null = null;

  for (const groupId of groupIds) {
    const groupStart = addOnStartByGroupDay.get(getGroupDayKey(groupId, dayOfWeek));
    if (groupStart === undefined) continue;
    startTime = Math.max(startTime ?? 0, groupStart);
  }

  return startTime;
}

function getLockedCoreMealActivityIdsByGroupId(input: FetInput, lockedActivities: FetActivity[]) {
  const subjectsById = new Map(input.subjects.map((subject) => [subject.id, subject]));
  const activityIdsByGroupId = new Map<string, number[]>();

  for (const activity of lockedActivities) {
    const subject = subjectsById.get(activity.subjectId);
    if (!subject || !isCoreRegimeSubject(subject.name)) continue;

    const current = activityIdsByGroupId.get(activity.groupId) ?? [];
    current.push(activity.id);
    activityIdsByGroupId.set(activity.groupId, current);
  }

  return activityIdsByGroupId;
}

function getBlockedCoreMealActivityIds(
  input: FetInput,
  groupId: string,
  lockedCoreMealsByGroupId: Map<string, number[]>,
) {
  return [...new Set(
    getAddOnAudienceGroupIds(input, groupId)
      .flatMap((audienceGroupId) => lockedCoreMealsByGroupId.get(audienceGroupId) ?? []),
  )];
}

function assertActivitiesHaveAllowedSlots(input: FetInput, activities: FetActivity[]) {
  const groupsById = new Map(input.groups.map((group) => [group.id, group]));
  const subjectsById = new Map(input.subjects.map((subject) => [subject.id, subject]));
  const emptyActivities = activities.filter((activity) => activity.allowedSlots.length === 0);

  if (emptyActivities.length === 0) return;

  throw new Error(
    `Для FET activities не осталось разрешенных слотов: ${emptyActivities.map((activity) => {
      const group = groupsById.get(activity.groupId);
      const subject = subjectsById.get(activity.subjectId);
      return `${activity.id} (${group?.name ?? activity.groupId} / ${subject?.name ?? activity.subjectId})`;
    }).join(", ")}`,
  );
}
