import { addDays, format, set, startOfWeek } from "date-fns";

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
  return addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), dayOfWeek - 1);
}

function mapTimeToDate(baseDate: Date, minutesFromMidnight: number) {
  return set(baseDate, {
    hours: Math.floor(minutesFromMidnight / 60),
    minutes: minutesFromMidnight % 60,
    seconds: 0,
    milliseconds: 0,
  });
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
  const detached = entry.startTime === 0 && entry.endTime === 1;
  const timeLabel = `${format(start, "HH:mm")}-${format(end, "HH:mm")}`;

  return {
    id: entry.id,
    templateId: entry.id,
    start,
    end,
    groupId: entry.group.id,
    dayOfWeek: entry.dayOfWeek,
    startMinutes: entry.startTime,
    endMinutes: entry.endTime,
    detached,
    subjectId: entry.subject.id,
    teacherId: entry.teacher?.id ?? null,
    roomId: entry.room?.id ?? null,
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
