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
  deliveryGroup: {
    select: {
      id: true,
      name: true,
      type: true,
      grade: true,
      subjectId: true,
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
  openClasses: {
    select: {
      classGroupId: true,
      schoolClass: {
        select: {
          id: true,
          name: true,
          grade: true,
          type: true,
        },
      },
    },
  },
  coveredClasses: {
    select: {
      classGroupId: true,
      schoolClass: {
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

type ProjectedClass = {
  id: string;
  name: string;
  grade: number | null;
};

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

function getProjectedClasses(entry: AdminScheduleTemplateRecord): ProjectedClass[] {
  if (entry.deliveryMode === "DIRECT_GROUP") {
    if (!entry.deliveryGroup) {
      return [];
    }

    if (entry.deliveryGroup.type === "SUBJECT_SUBGROUP" && entry.deliveryGroup.parentGroup) {
      return [{
        id: entry.deliveryGroup.parentGroup.id,
        name: entry.deliveryGroup.parentGroup.name,
        grade: entry.deliveryGroup.parentGroup.grade ?? null,
      }];
    }

    return [{
      id: entry.deliveryGroup.id,
      name: entry.deliveryGroup.name,
      grade: entry.deliveryGroup.grade ?? null,
    }];
  }

  if (entry.deliveryMode === "ELECTIVE_GROUP") {
    return entry.openClasses
      .map((item) => ({
        id: item.schoolClass.id,
        name: item.schoolClass.name,
        grade: item.schoolClass.grade ?? null,
      }))
      .sort((left, right) => left.name.localeCompare(right.name, "ru"));
  }

  return entry.coveredClasses
    .map((item) => ({
      id: item.schoolClass.id,
      name: item.schoolClass.name,
      grade: item.schoolClass.grade ?? null,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "ru"));
}

function getGroupLabel(entry: AdminScheduleTemplateRecord) {
  if (entry.deliveryMode === "SHARED_CLASSES") {
    return entry.coveredClasses
      .map((item) => item.schoolClass.name)
      .sort((left, right) => left.localeCompare(right, "ru"))
      .join(" + ");
  }

  return entry.deliveryGroup?.name ?? "Группа не указана";
}

export function mapWeeklyTemplateToAdminScheduleEvents(
  entry: AdminScheduleTemplateRecord,
): AdminScheduleEvent[] {
  const teacherName = entry.teacher?.user
    ? getUserFullName(entry.teacher.user) || MISSING_TEACHER_LABEL
    : MISSING_TEACHER_LABEL;
  const roomName = entry.room?.name ?? MISSING_ROOM_LABEL;
  const detached = entry.dayOfWeek === null || entry.startTime === null || entry.endTime === null;
  const baseDate = mapDayOfWeekToDate(entry.dayOfWeek ?? 1);
  const start = mapTimeToDate(baseDate, entry.startTime ?? 0);
  const end = mapTimeToDate(baseDate, entry.endTime ?? 1);
  const timeLabel = detached ? "Без времени" : `${format(start, "HH:mm")}-${format(end, "HH:mm")}`;
  const groupName = getGroupLabel(entry);
  const projectedClasses = getProjectedClasses(entry);

  return projectedClasses.map((projectedClass) => ({
    id: `${entry.id}:${projectedClass.id}`,
    templateId: entry.id,
    projectionClassId: projectedClass.id,
    deliveryMode: entry.deliveryMode,
    deliveryGroupId: entry.deliveryGroup?.id ?? null,
    deliveryGroupType: entry.deliveryGroup?.type ?? null,
    openClassIds: entry.openClasses.map((item) => item.classGroupId),
    coveredClassIds: entry.coveredClasses.map((item) => item.classGroupId),
    start,
    end,
    dayOfWeek: entry.dayOfWeek,
    startMinutes: entry.startTime,
    endMinutes: entry.endTime,
    detached,
    subjectId: entry.subject.id,
    teacherId: entry.teacher?.id ?? null,
    roomId: entry.room?.id ?? null,
    classId: projectedClass.id,
    className: projectedClass.name,
    groupName,
    groupType: entry.deliveryGroup?.type ?? "CLASS",
    subjectName: entry.subject.name,
    subjectType: entry.subject.type,
    teacherName,
    roomName,
    timeLabel,
    metaLine: `${teacherName} • ${roomName}`,
  }));
}
