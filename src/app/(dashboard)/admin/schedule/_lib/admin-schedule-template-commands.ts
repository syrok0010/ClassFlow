import type {
  AdminScheduleTemplateMutationInput,
  AdminScheduleTemplateTimeMoveInput,
} from "./schedule-mutations-schema";
import type { AdminScheduleEvent } from "./admin-schedule-types";

export type ScheduleTemplateMoveTarget = {
  dayOfWeek: number;
  rowId: string;
  startMinutes: number;
};

export function buildDraftFromEvent(event: AdminScheduleEvent): AdminScheduleTemplateMutationInput {
  return {
    templateId: event.templateId,
    dayOfWeek: event.dayOfWeek,
    startMinutes: event.startMinutes,
    endMinutes: event.endMinutes,
    subjectId: event.subjectId,
    deliveryMode: event.deliveryMode,
    deliveryGroupId: event.deliveryGroupId,
    roomId: event.roomId,
    teacherId: event.teacherId,
    openClassIds: event.openClassIds,
    coveredClassIds: event.coveredClassIds,
  };
}

export function buildEmptyDraft(): AdminScheduleTemplateMutationInput {
  return {
    dayOfWeek: null,
    startMinutes: null,
    endMinutes: null,
    subjectId: "",
    deliveryMode: "DIRECT_GROUP",
    deliveryGroupId: null,
    roomId: null,
    teacherId: null,
    openClassIds: [],
    coveredClassIds: [],
  };
}

export function buildDetachTemplateInput(
  event: AdminScheduleEvent,
): AdminScheduleTemplateTimeMoveInput {
  return {
    templateId: event.templateId,
    dayOfWeek: null,
    startMinutes: null,
    endMinutes: null,
  };
}

export function buildMoveTemplateInput(
  event: AdminScheduleEvent,
  dropTarget: ScheduleTemplateMoveTarget,
  lessonDurationByGroupSubject: Record<string, number>,
): AdminScheduleTemplateTimeMoveInput | null {
  if (dropTarget.rowId !== event.projectionClassId) {
    return null;
  }

  return {
    templateId: event.templateId,
    dayOfWeek: dropTarget.dayOfWeek,
    startMinutes: dropTarget.startMinutes,
    endMinutes: dropTarget.startMinutes + getEventDurationMinutes(event, lessonDurationByGroupSubject),
  };
}

function getEventDurationMinutes(
  event: AdminScheduleEvent,
  lessonDurationByGroupSubject: Record<string, number>,
) {
  if (event.startMinutes === null || event.endMinutes === null) {
    const expectedDuration = getExpectedEventDurationMinutes(event, lessonDurationByGroupSubject);

    if (expectedDuration !== null) {
      return expectedDuration;
    }

    return 45;
  }

  return Math.max(1, event.endMinutes - event.startMinutes);
}

function getExpectedEventDurationMinutes(
  event: AdminScheduleEvent,
  lessonDurationByGroupSubject: Record<string, number>,
) {
  const groupIds = getDurationLookupGroupIds(event);

  if (groupIds.length === 0) {
    return null;
  }

  const durations = Array.from(new Set(
    groupIds
      .map((groupId) => lessonDurationByGroupSubject[`${groupId}:${event.subjectId}`])
      .filter((duration): duration is number => typeof duration === "number"),
  ));

  return durations.length === 1 ? durations[0] : null;
}

function getDurationLookupGroupIds(event: AdminScheduleEvent) {
  if (event.deliveryMode === "SHARED_CLASSES") {
    return event.coveredClassIds;
  }

  if (!event.deliveryGroupId) {
    return [];
  }

  if (event.deliveryGroupType === "SUBJECT_SUBGROUP" && event.parentClassId) {
    return [event.parentClassId, event.deliveryGroupId];
  }

  return [event.deliveryGroupId];
}
