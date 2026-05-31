import { addDays, set, startOfWeek } from "date-fns";

import { Prisma } from "@/generated/prisma/client";
import { getUserFullName } from "@/lib/auth-access";

import type { AdminScheduleEvent } from "./admin-schedule-types";
import {
  mapScheduleDeliveryGroup,
  mapScheduleGroupToLinkedClass,
  mapScheduleProjectionSourceToAdminEvents,
  type RequirementMeta,
} from "./schedule-projection-mapper";

export const adminScheduleTemplateInclude = {
  subject: { select: { id: true, name: true, type: true, defaultAttendanceLoadMode: true } },
  teacher: {
    select: {
      id: true,
      user: { select: { surname: true, name: true, patronymicName: true } },
    },
  },
  room: { select: { id: true, name: true, seatsCount: true } },
  deliveryGroup: {
    select: {
      id: true,
      name: true,
      type: true,
      grade: true,
      subjectId: true,
      _count: { select: { studentGroups: true } },
      parentGroup: {
        select: {
          id: true,
          name: true,
          grade: true,
          type: true,
          _count: { select: { studentGroups: true } },
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
          _count: { select: { studentGroups: true } },
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
          _count: { select: { studentGroups: true } },
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

export type { RequirementMeta };

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

export function mapWeeklyTemplateToAdminScheduleEvents(
  entry: AdminScheduleTemplateRecord,
  requirementMetaByGroupSubject: Record<string, RequirementMeta> = {},
): AdminScheduleEvent[] {
  const teacherName = entry.teacher?.user
    ? getUserFullName(entry.teacher.user) || MISSING_TEACHER_LABEL
    : MISSING_TEACHER_LABEL;
  const roomName = entry.room?.name ?? MISSING_ROOM_LABEL;
  const detached = entry.dayOfWeek === null || entry.startTime === null || entry.endTime === null;
  const baseDate = mapDayOfWeekToDate(entry.dayOfWeek ?? 1);
  const start = mapTimeToDate(baseDate, entry.startTime ?? 0);
  const end = mapTimeToDate(baseDate, entry.endTime ?? 1);
  const attendanceLoadMode = entry.attendanceLoadModeOverride ?? entry.subject.defaultAttendanceLoadMode;

  return mapScheduleProjectionSourceToAdminEvents(
    {
      id: entry.id,
      deliveryMode: entry.deliveryMode,
      deliveryGroup: mapScheduleDeliveryGroup(entry.deliveryGroup),
      openClasses: entry.openClasses.map((item) => mapScheduleGroupToLinkedClass(item.schoolClass)),
      coveredClasses: entry.coveredClasses.map((item) => mapScheduleGroupToLinkedClass(item.schoolClass)),
      start,
      end,
      dayOfWeek: entry.dayOfWeek,
      startMinutes: entry.startTime,
      endMinutes: entry.endTime,
      detached,
      subjectId: entry.subject.id,
      subjectName: entry.subject.name,
      subjectType: entry.subject.type,
      attendanceLoadMode,
      teacherId: entry.teacher?.id ?? null,
      teacherName,
      roomId: entry.room?.id ?? null,
      roomName,
      roomSeatsCount: entry.room?.seatsCount ?? null,
    },
    requirementMetaByGroupSubject,
  );
}
