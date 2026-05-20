import type { AdminScheduleTemplateMutationInput } from "./schedule-mutations-schema";
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
): AdminScheduleTemplateMutationInput {
  return {
    ...getSharedTemplateInput(event),
    dayOfWeek: null,
    startMinutes: null,
    endMinutes: null,
  };
}

export function buildMoveTemplateInput(
  event: AdminScheduleEvent,
  dropTarget: ScheduleTemplateMoveTarget,
): AdminScheduleTemplateMutationInput | null {
  if (
    event.deliveryMode === "DIRECT_GROUP"
    && event.deliveryGroupType === "SUBJECT_SUBGROUP"
    && dropTarget.rowId !== event.projectionClassId
  ) {
    return null;
  }

  return {
    ...getSharedTemplateInput(event),
    dayOfWeek: dropTarget.dayOfWeek,
    startMinutes: dropTarget.startMinutes,
    endMinutes: dropTarget.startMinutes + getEventDurationMinutes(event),
    deliveryGroupId: getMovedDeliveryGroupId(event, dropTarget.rowId),
    openClassIds: getMovedOpenClassIds(event, dropTarget.rowId),
    coveredClassIds: getMovedCoveredClassIds(event, dropTarget.rowId),
  };
}

function getSharedTemplateInput(
  event: AdminScheduleEvent,
): Omit<
  AdminScheduleTemplateMutationInput,
  "dayOfWeek" | "startMinutes" | "endMinutes"
> {
  return {
    templateId: event.templateId,
    deliveryMode: event.deliveryMode,
    deliveryGroupId: event.deliveryGroupId,
    openClassIds: event.openClassIds,
    coveredClassIds: event.coveredClassIds,
    subjectId: event.subjectId,
    roomId: event.roomId,
    teacherId: event.teacherId,
  };
}

function getEventDurationMinutes(event: AdminScheduleEvent) {
  if (event.startMinutes === null || event.endMinutes === null) {
    return 45;
  }

  return Math.max(1, event.endMinutes - event.startMinutes);
}

function getMovedDeliveryGroupId(event: AdminScheduleEvent, targetClassId: string) {
  if (event.deliveryMode !== "DIRECT_GROUP" || event.deliveryGroupType !== "CLASS") {
    return event.deliveryGroupId;
  }

  return targetClassId;
}

function getMovedOpenClassIds(event: AdminScheduleEvent, targetClassId: string) {
  if (event.deliveryMode !== "ELECTIVE_GROUP") {
    return event.openClassIds;
  }

  return replaceProjectionClassId(
    event.openClassIds,
    event.projectionClassId,
    targetClassId,
  );
}

function getMovedCoveredClassIds(event: AdminScheduleEvent, targetClassId: string) {
  if (event.deliveryMode !== "SHARED_CLASSES") {
    return event.coveredClassIds;
  }

  return replaceProjectionClassId(
    event.coveredClassIds,
    event.projectionClassId,
    targetClassId,
  );
}

function replaceProjectionClassId(
  classIds: string[],
  sourceClassId: string,
  targetClassId: string,
) {
  if (sourceClassId === targetClassId || classIds.includes(targetClassId)) {
    return classIds;
  }

  const nextClassIds = classIds.map((classId) => (
    classId === sourceClassId ? targetClassId : classId
  ));

  return Array.from(new Set(nextClassIds));
}
