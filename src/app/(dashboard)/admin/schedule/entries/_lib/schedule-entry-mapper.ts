import { format, getISODay } from "date-fns";

import { Prisma } from "@/generated/prisma/client";
import { getMinutesSinceStartOfDay } from "@/features/schedule/lib/date-utils";
import { getUserFullName } from "@/lib/auth-access";

import type { AdminScheduleEvent } from "../../_lib/admin-schedule-types";
import {
  mapScheduleDeliveryGroup,
  mapScheduleGroupToLinkedClass,
  mapScheduleProjectionSourceToAdminEvents,
  type RequirementMeta,
} from "../../_lib/schedule-projection-mapper";
import {
  MISSING_ROOM_LABEL,
  MISSING_TEACHER_LABEL,
} from "./constants";

export const scheduleEntryInclude = {
  subject: { select: { id: true, name: true, type: true } },
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
      electiveClassLinks: {
        select: {
          classGroupId: true,
          classGroup: {
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
} satisfies Prisma.ScheduleEntryInclude;

export type ScheduleEntryRecord = Prisma.ScheduleEntryGetPayload<{
  include: typeof scheduleEntryInclude;
}>;

export function mapScheduleEntryToConflictProjections(
  entry: ScheduleEntryRecord,
  requirementMetaByGroupSubject: Record<string, RequirementMeta> = {},
): AdminScheduleEvent[] {
  const teacherName = entry.teacher?.user
    ? getUserFullName(entry.teacher.user) || MISSING_TEACHER_LABEL
    : MISSING_TEACHER_LABEL;
  const roomName = entry.room?.name ?? MISSING_ROOM_LABEL;

  return mapScheduleProjectionSourceToAdminEvents(
    {
      id: entry.id,
      deliveryMode: entry.deliveryMode,
      deliveryGroup: mapScheduleDeliveryGroup(entry.deliveryGroup),
      openClasses:
        entry.deliveryGroup?.electiveClassLinks.map((item) =>
          mapScheduleGroupToLinkedClass(item.classGroup),
        ) ?? [],
      coveredClasses: entry.coveredClasses.map((item) =>
        mapScheduleGroupToLinkedClass(item.schoolClass),
      ),
      start: entry.startTime,
      end: entry.endTime,
      dayOfWeek: getISODay(entry.startTime),
      startMinutes: getMinutesSinceStartOfDay(entry.startTime),
      endMinutes: getMinutesSinceStartOfDay(entry.endTime),
      detached: false,
      subjectId: entry.subject.id,
      subjectName: entry.subject.name,
      subjectType: entry.subject.type,
      attendanceLoadMode: entry.attendanceLoadMode,
      teacherId: entry.teacher?.id ?? null,
      teacherName,
      roomId: entry.room?.id ?? null,
      roomName,
      roomSeatsCount: entry.room?.seatsCount ?? null,
    },
    requirementMetaByGroupSubject,
  );
}

export function mapScheduleEntryToAdminScheduleEvent(
  entry: ScheduleEntryRecord,
  requirementMetaByGroupSubject: Record<string, RequirementMeta> = {},
): AdminScheduleEvent {
  const primaryProjection = mapScheduleEntryToConflictProjections(entry, requirementMetaByGroupSubject)[0];

  if (primaryProjection) {
    return {
      ...primaryProjection,
      id: entry.id,
    };
  }

  return {
    id: entry.id,
    templateId: entry.id,
    projectionClassId: entry.id,
    deliveryMode: entry.deliveryMode,
    deliveryGroupId: entry.deliveryGroup?.id ?? null,
    deliveryGroupType: entry.deliveryGroup?.type ?? null,
    openClassIds: [],
    coveredClassIds: [],
    openClasses: [],
    coveredClasses: [],
    start: entry.startTime,
    end: entry.endTime,
    dayOfWeek: getISODay(entry.startTime),
    startMinutes: getMinutesSinceStartOfDay(entry.startTime),
    endMinutes: getMinutesSinceStartOfDay(entry.endTime),
    detached: false,
    subjectId: entry.subject.id,
    subjectName: entry.subject.name,
    subjectType: entry.subject.type,
    attendanceLoadMode: entry.attendanceLoadMode,
    teacherId: entry.teacher?.id ?? null,
    teacherName: entry.teacher?.user ? getUserFullName(entry.teacher.user) || MISSING_TEACHER_LABEL : MISSING_TEACHER_LABEL,
    roomId: entry.room?.id ?? null,
    roomName: entry.room?.name ?? MISSING_ROOM_LABEL,
    roomSeatsCount: entry.room?.seatsCount ?? null,
    groupName: entry.deliveryGroup?.name ?? "Группа не указана",
    deliveryGroupStudentCount: entry.deliveryGroup?._count.studentGroups ?? null,
    parentClassId: null,
    parentClassName: null,
    parentClassGrade: null,
    parentClassStudentCount: null,
    minimumBreakAfterMinutes: null,
    classId: entry.deliveryGroup?.id ?? entry.id,
    className: entry.deliveryGroup?.name ?? "Группа не указана",
    groupType: entry.deliveryGroup?.type ?? "CLASS",
    timeLabel: `${format(entry.startTime, "HH:mm")}-${format(entry.endTime, "HH:mm")}`,
    metaLine: `${entry.teacher?.user ? getUserFullName(entry.teacher.user) || MISSING_TEACHER_LABEL : MISSING_TEACHER_LABEL} • ${entry.room?.name ?? MISSING_ROOM_LABEL}`,
  };
}
