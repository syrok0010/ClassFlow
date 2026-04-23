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
  group: { select: { id: true, name: true, type: true } },
  room: { select: { id: true, name: true } },
  template: {
    select: {
      id: true,
      groupId: true,
      roomId: true,
      teacherId: true,
      subjectId: true,
      startTime: true,
      endTime: true,
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

  return {
    id: entry.id,
    start: entry.startTime,
    end: entry.endTime,
    subjectName: entry.subject.name,
    subjectType: entry.subject.type,
    subjectTypeLabel: SUBJECT_LABELS[entry.subject.type],
    groupName: entry.group.name,
    groupType: entry.group.type,
    roomName,
    timeLabel: `${format(entry.startTime, "HH:mm")}-${format(entry.endTime, "HH:mm")}`,
    metaLine: `${entry.group.name} • ${roomName}`,
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
    entry.template.groupId !== entry.groupId ||
    entry.template.roomId !== entry.roomId ||
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
