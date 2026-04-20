import { format } from "date-fns";

import type { GroupType, SubjectType } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { getUserFullName } from "@/lib/auth-access";

import type {
  StudentScheduleEvent,
  StudentScheduleStatusLabel,
} from "./student-schedule-types";

export const studentScheduleEntryInclude = {
  subject: { select: { id: true, name: true, type: true } },
  teacher: {
    select: {
      id: true,
      user: { select: { surname: true, name: true, patronymicName: true } },
    },
  },
  room: { select: { id: true, name: true } },
  group: { select: { id: true, name: true, type: true } },
  template: {
    select: {
      id: true,
      startTime: true,
      endTime: true,
      teacherId: true,
      roomId: true,
      subjectId: true,
    },
  },
} satisfies Prisma.ScheduleEntryInclude;

export type StudentScheduleEntryRecord = Prisma.ScheduleEntryGetPayload<{
  include: typeof studentScheduleEntryInclude;
}>;

const MISSING_TEACHER_LABEL = "Преподаватель не назначен";
const MISSING_ROOM_LABEL = "Кабинет не указан";

export function mapScheduleEntryToStudentScheduleEvent(
  entry: StudentScheduleEntryRecord
): StudentScheduleEvent {
  const teacherName = entry.teacher?.user
    ? getUserFullName(entry.teacher.user) || MISSING_TEACHER_LABEL
    : MISSING_TEACHER_LABEL;
  const roomName = entry.room?.name ?? MISSING_ROOM_LABEL;
  const statusLabels = resolveStatusLabels(entry);

  return {
    id: entry.id,
    start: entry.startTime,
    end: entry.endTime,
    subjectName: entry.subject.name,
    subjectType: entry.subject.type as SubjectType,
    teacherName,
    roomName,
    groupName: entry.group.name,
    groupType: entry.group.type as GroupType,
    timeLabel: `${format(entry.startTime, "HH:mm")}-${format(entry.endTime, "HH:mm")}`,
    statusLabels,
    metaLine: `${teacherName} • ${roomName}`,
  };
}

function resolveStatusLabels(entry: StudentScheduleEntryRecord): StudentScheduleStatusLabel[] {
  const labels: StudentScheduleStatusLabel[] = [];

  if (entry.templateId === null) {
    labels.push("Внепланово");
  }

  if (entry.template) {
    const entryStartTime = format(entry.startTime, "HH:mm");
    const entryEndTime = format(entry.endTime, "HH:mm");
    const hasRescheduledTime =
      entry.template.startTime !== entryStartTime || entry.template.endTime !== entryEndTime;
    const hasReplacement =
      entry.template.teacherId !== entry.teacherId ||
      entry.template.roomId !== entry.roomId ||
      entry.template.subjectId !== entry.subjectId;

    if (hasRescheduledTime) {
      labels.push("Перенос");
    }

    if (hasReplacement) {
      labels.push("Замена");
    }
  }

  return labels;
}
