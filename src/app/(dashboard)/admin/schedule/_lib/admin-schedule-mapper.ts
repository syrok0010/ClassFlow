import { format } from "date-fns";

import { Prisma } from "@/generated/prisma/client";
import { getUserFullName } from "@/lib/auth-access";

import type { AdminScheduleEvent } from "./admin-schedule-types";

export const adminScheduleTemplateInclude = {
  subject: { select: { id: true, name: true, type: true } },
  teacher: {
    select: {
      id: true,
      user: { select: { surname: true, name: true, patronymicName: true } },
    },
  },
  room: { select: { id: true, name: true } },
  group: {
    select: {
      id: true,
      name: true,
      type: true,
      parentGroup: {
        select: {
          id: true,
          name: true,
          grade: true,
          type: true,
        },
      },
    },
  },
} satisfies Prisma.WeeklyScheduleTemplateInclude;

export type AdminScheduleTemplateRecord = Prisma.WeeklyScheduleTemplateGetPayload<{
  include: typeof adminScheduleTemplateInclude;
}>;

const MISSING_TEACHER_LABEL = "Преподаватель не назначен";
const MISSING_ROOM_LABEL = "Кабинет не указан";

function getClassInfo(entry: AdminScheduleTemplateRecord) {
  if (entry.group.type === "SUBJECT_SUBGROUP" && entry.group.parentGroup) {
    return {
      classId: entry.group.parentGroup.id,
      className: entry.group.parentGroup.name,
    };
  }

  return {
    classId: entry.group.id,
    className: entry.group.name,
  };
}

function mapDayOfWeekToDate(dayOfWeek: number) {
  const current = new Date();
  const mondayOffset = (current.getDay() + 6) % 7;
  const monday = new Date(current);
  monday.setDate(current.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const date = new Date(monday);
  date.setDate(monday.getDate() + (dayOfWeek - 1));
  return date;
}

function mapTimeToDate(baseDate: Date, minutesFromMidnight: number) {
  const date = new Date(baseDate);
  date.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0);
  return date;
}

export function mapWeeklyTemplateToAdminScheduleEvent(
  entry: AdminScheduleTemplateRecord,
): AdminScheduleEvent {
  const classInfo = getClassInfo(entry);
  const date = mapDayOfWeekToDate(entry.dayOfWeek);
  const start = mapTimeToDate(date, entry.startTime);
  const end = mapTimeToDate(date, entry.endTime);
  const teacherName = entry.teacher?.user
    ? getUserFullName(entry.teacher.user) || MISSING_TEACHER_LABEL
    : MISSING_TEACHER_LABEL;
  const roomName = entry.room?.name ?? MISSING_ROOM_LABEL;
  const timeLabel = `${format(start, "HH:mm")}-${format(end, "HH:mm")}`;

  return {
    id: entry.id,
    start,
    end,
    classId: classInfo.classId,
    className: classInfo.className,
    groupName: entry.group.name,
    groupType: entry.group.type,
    subjectName: entry.subject.name,
    subjectType: entry.subject.type,
    teacherName,
    roomName,
    timeLabel,
    metaLine: `${teacherName} • ${roomName}`,
  };
}
