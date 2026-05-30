import { addDays, format, set, startOfWeek } from "date-fns";

import { Prisma } from "@/generated/prisma/client";
import { getUserFullName } from "@/lib/auth-access";

import type { AdminScheduleEvent } from "./admin-schedule-types";

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

type ProjectedClass = {
  id: string;
  name: string;
  grade: number | null;
};

export type RequirementMeta = {
  lessonsPerWeek: number;
  breakDuration: number;
};

function getRequirementMetaGroupId(
  entry: AdminScheduleTemplateRecord,
  projectedClassId: string,
) {
  if (entry.deliveryMode === "SHARED_CLASSES") {
    return projectedClassId;
  }

  if (entry.deliveryGroup?.type === "SUBJECT_SUBGROUP") {
    return entry.deliveryGroup.parentGroup?.id ?? entry.deliveryGroup.id;
  }

  return entry.deliveryGroup?.id ?? null;
}

function mapClassInfo(group: {
  id: string;
  name: string;
  grade: number | null;
  _count?: { studentGroups: number };
}) {
  return {
    id: group.id,
    name: group.name,
    grade: group.grade ?? null,
    studentCount: group._count?.studentGroups ?? 0,
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
  const timeLabel = detached ? "Без времени" : `${format(start, "HH:mm")}-${format(end, "HH:mm")}`;
  const groupName = getGroupLabel(entry);
  const projectedClasses = getProjectedClasses(entry);
  const openClasses = entry.openClasses.map((item) => mapClassInfo(item.schoolClass));
  const coveredClasses = entry.coveredClasses.map((item) => mapClassInfo(item.schoolClass));
  const parentClass = entry.deliveryGroup?.type === "SUBJECT_SUBGROUP" && entry.deliveryGroup.parentGroup
    ? mapClassInfo(entry.deliveryGroup.parentGroup)
    : entry.deliveryGroup?.type === "CLASS"
      ? {
          id: entry.deliveryGroup.id,
          name: entry.deliveryGroup.name,
          grade: entry.deliveryGroup.grade ?? null,
          studentCount: entry.deliveryGroup._count.studentGroups,
        }
      : null;
  const deliveryGroupStudentCount = entry.deliveryGroup?._count.studentGroups ?? null;
  const attendanceLoadMode = entry.attendanceLoadModeOverride ?? entry.subject.defaultAttendanceLoadMode;
  const resolveRequirementMeta = (projectedClassId: string) => {
    const requirementGroupId = getRequirementMetaGroupId(entry, projectedClassId);

    return requirementGroupId
      ? requirementMetaByGroupSubject[`${requirementGroupId}:${entry.subjectId}`] ?? null
      : null;
  };

  return projectedClasses.map((projectedClass) => ({
    minimumBreakAfterMinutes: resolveRequirementMeta(projectedClass.id)?.breakDuration ?? null,
    id: `${entry.id}:${projectedClass.id}`,
    templateId: entry.id,
    projectionClassId: projectedClass.id,
    deliveryMode: entry.deliveryMode,
    deliveryGroupId: entry.deliveryGroup?.id ?? null,
    deliveryGroupType: entry.deliveryGroup?.type ?? null,
    openClassIds: entry.openClasses.map((item) => item.classGroupId),
    coveredClassIds: entry.coveredClasses.map((item) => item.classGroupId),
    openClasses,
    coveredClasses,
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
    groupName,
    deliveryGroupStudentCount,
    parentClassId: parentClass?.id ?? null,
    parentClassName: parentClass?.name ?? null,
    parentClassGrade: parentClass?.grade ?? null,
    parentClassStudentCount: parentClass?.studentCount ?? null,
    classId: projectedClass.id,
    className: projectedClass.name,
    groupType: entry.deliveryGroup?.type ?? "CLASS",
    timeLabel,
    metaLine: `${teacherName} • ${roomName}`,
  }));
}
