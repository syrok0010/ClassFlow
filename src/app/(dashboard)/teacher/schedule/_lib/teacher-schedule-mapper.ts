import { format } from "date-fns";

import { Prisma } from "@/generated/prisma/client";
import { SUBJECT_LABELS } from "@/lib/constants";

import type {
  TeacherScheduleEvent,
  TeacherScheduleEventStatus,
} from "./teacher-schedule-types";
import {getMinutesSinceStartOfDay} from "@/features/schedule/lib/date-utils";

export const teacherScheduleEntryInclude = {
  subject: { select: { id: true, name: true, type: true } },
  deliveryGroup: { select: { id: true, name: true, type: true } },
  coveredClasses: {
    select: {
      classGroupId: true,
      schoolClass: { select: { id: true, name: true, type: true } },
    },
  },
  room: { select: { id: true, name: true } },
  template: {
    select: {
      id: true,
      deliveryMode: true,
      deliveryGroupId: true,
      roomId: true,
      teacherId: true,
      subjectId: true,
      startTime: true,
      endTime: true,
      coveredClasses: {
        select: {
          classGroupId: true,
        },
      },
    },
  },
} satisfies Prisma.ScheduleEntryInclude;

export type TeacherScheduleEntryRecord = Prisma.ScheduleEntryGetPayload<{
  include: typeof teacherScheduleEntryInclude;
}>;

const MISSING_ROOM_LABEL = "Кабинет не указан";

export function mapScheduleEntryToTeacherScheduleEvent(
  entry: TeacherScheduleEntryRecord
): TeacherScheduleEvent {
  const roomName = entry.room?.name ?? MISSING_ROOM_LABEL;
  const status = resolveTeacherScheduleEventStatus(entry);
  const coveredClassNames = entry.coveredClasses.map((item) => item.schoolClass.name).sort((left, right) => left.localeCompare(right, "ru"));
  const groupName = entry.deliveryGroup?.name ?? coveredClassNames.join(" + ");
  const groupType = entry.deliveryGroup?.type ?? "CLASS";

  return {
    id: entry.id,
    start: entry.startTime,
    end: entry.endTime,
    subjectName: entry.subject.name,
    subjectType: entry.subject.type,
    subjectTypeLabel: SUBJECT_LABELS[entry.subject.type],
    groupName,
    groupType,
    roomName,
    timeLabel: `${format(entry.startTime, "HH:mm")}-${format(entry.endTime, "HH:mm")}`,
    metaLine: `${groupName} • ${roomName}`,
    status,
    statusLabel: TEACHER_STATUS_LABELS[status],
  };
}

function resolveTeacherScheduleEventStatus(
  entry: TeacherScheduleEntryRecord
): TeacherScheduleEventStatus {
  if (!entry.templateId || !entry.template) {
    return "ad_hoc";
  }

  if (entry.template.teacherId !== entry.teacherId) {
    return "substitution";
  }

  if (
    entry.template.subjectId !== entry.subjectId ||
    entry.template.deliveryMode !== entry.deliveryMode ||
    entry.template.deliveryGroupId !== entry.deliveryGroupId ||
    entry.template.roomId !== entry.roomId ||
    serializeCoveredClassIds(entry.template.coveredClasses.map((item) => item.classGroupId))
      !== serializeCoveredClassIds(entry.coveredClasses.map((item) => item.classGroupId)) ||
    getMinutesSinceStartOfDay(entry.startTime) !== entry.template.startTime ||
    getMinutesSinceStartOfDay(entry.endTime) !== entry.template.endTime
  ) {
    return "updated";
  }

  return "scheduled";
}

const TEACHER_STATUS_LABELS: Record<TeacherScheduleEventStatus, string> = {
  scheduled: "",
  substitution: "Замена",
  updated: "Изменено",
  ad_hoc: "Разовое событие"
}

function serializeCoveredClassIds(classIds: string[]) {
  return [...classIds].sort().join("|");
}
