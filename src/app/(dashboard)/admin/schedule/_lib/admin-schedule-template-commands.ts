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
): AdminScheduleTemplateTimeMoveInput | null {
  if (dropTarget.rowId !== event.projectionClassId) {
    return null;
  }

  return {
    templateId: event.templateId,
    dayOfWeek: dropTarget.dayOfWeek,
    startMinutes: dropTarget.startMinutes,
    endMinutes: dropTarget.startMinutes + getEventDurationMinutes(event),
  };
}

function getEventDurationMinutes(event: AdminScheduleEvent) {
  if (event.startMinutes === null || event.endMinutes === null) {
    return 45;
  }

  return Math.max(1, event.endMinutes - event.startMinutes);
}
