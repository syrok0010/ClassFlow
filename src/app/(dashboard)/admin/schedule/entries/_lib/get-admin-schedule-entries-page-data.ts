import { format, getISODay } from "date-fns";

import { getScheduleRange } from "@/features/schedule";
import { getMinutesSinceStartOfDay } from "@/features/schedule/lib/date-utils";
import { Prisma } from "@/generated/prisma/client";
import type { GroupType } from "@/generated/prisma/enums";
import { getUserFullName } from "@/lib/auth-access";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/server-action-auth";

import type { AdminScheduleEvent } from "../../_lib/admin-schedule-types";
import type { RequirementMeta } from "../../_lib/admin-schedule-mapper";
import {
  AdminScheduleEntriesPageData,
  AdminScheduleEntriesScope, GetAdminScheduleEntriesPageDataParams
} from "@/app/(dashboard)/admin/schedule/entries/_lib/types";
import {
  GROUP_TYPE_LABELS,
  MISSING_ROOM_LABEL,
  MISSING_TEACHER_LABEL
} from "@/app/(dashboard)/admin/schedule/entries/_lib/constants";

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

export function parseAdminScheduleEntriesScope(
  value: string | string[] | undefined,
): AdminScheduleEntriesScope {
  return value === "teacher" || value === "room" ? value : "group";
}

export function parseAdminScheduleEntriesTargetId(
  value: string | string[] | undefined,
): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export async function getAdminScheduleEntriesPageData({
  anchorDate,
  viewMode,
  scope,
  targetId,
}: GetAdminScheduleEntriesPageDataParams): Promise<AdminScheduleEntriesPageData> {
  await requireAdminContext();

  const dateParam = format(anchorDate, "yyyy-MM-dd");
  const { rangeStart, rangeEnd } = getScheduleRange(anchorDate, viewMode);

  const [groups, teachers, rooms] = await Promise.all([
    prisma.group.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        grade: true,
      },
      orderBy: [{ type: "asc" }, { grade: "asc" }, { name: "asc" }],
    }),
    prisma.teacher.findMany({
      select: {
        id: true,
        user: {
          select: {
            surname: true,
            name: true,
            patronymicName: true,
          },
        },
      },
      orderBy: [
        { user: { surname: "asc" } },
        { user: { name: "asc" } },
        { id: "asc" },
      ],
    }),
    prisma.room.findMany({
      select: {
        id: true,
        name: true,
        building: { select: { name: true } },
      },
      orderBy: [
        { building: { name: "asc" } },
        { name: "asc" },
        { id: "asc" },
      ],
    }),
  ]);

  const options: AdminScheduleEntriesPageData["options"] = {
    group: groups.map((group) => ({
      id: group.id,
      label: group.name,
      description: GROUP_TYPE_LABELS[group.type],
    })),
    teacher: teachers.map((teacher) => ({
      id: teacher.id,
      label: getUserFullName(teacher.user) || "Преподаватель без имени",
    })),
    room: rooms.map((room) => ({
      id: room.id,
      label: room.name,
      description: room.building?.name ?? undefined,
    })),
  };

  const selectedTarget = targetId
    ? options[scope].find((option) => option.id === targetId) ?? null
    : null;

  if (!selectedTarget) {
    return {
      anchorDate,
      dateParam,
      viewMode,
      scope,
      targetId: null,
      selectedTarget: null,
      options,
      events: [],
    };
  }

  const scheduleEntries = await prisma.scheduleEntry.findMany({
    where: {
      startTime: {
        gte: rangeStart,
        lt: rangeEnd,
      },
      ...(scope === "group"
        ? {
            OR: [
              { deliveryGroupId: selectedTarget.id },
              {
                deliveryGroup: {
                  parentId: selectedTarget.id,
                  type: "SUBJECT_SUBGROUP",
                },
              },
              {
                coveredClasses: {
                  some: {
                    classGroupId: selectedTarget.id,
                  },
                },
              },
            ],
          }
        : {}),
      ...(scope === "teacher" ? { teacherId: selectedTarget.id } : {}),
      ...(scope === "room" ? { roomId: selectedTarget.id } : {}),
    },
    include: scheduleEntryInclude,
    orderBy: [{ startTime: "asc" }, { endTime: "asc" }, { id: "asc" }],
  });

  return {
    anchorDate,
    dateParam,
    viewMode,
    scope,
    targetId: selectedTarget.id,
    selectedTarget,
    options,
    events: scheduleEntries.map((entry) => mapScheduleEntryToAdminScheduleEvent(entry)),
  };
}

export function mapScheduleEntryToConflictProjections(
  entry: ScheduleEntryRecord,
  requirementMetaByGroupSubject: Record<string, RequirementMeta> = {},
): AdminScheduleEvent[] {
  const teacherName = entry.teacher?.user
    ? getUserFullName(entry.teacher.user) || MISSING_TEACHER_LABEL
    : MISSING_TEACHER_LABEL;
  const roomName = entry.room?.name ?? MISSING_ROOM_LABEL;
  const groupName = getGroupLabel(entry);
  const openClasses = entry.deliveryGroup?.electiveClassLinks.map((item) => mapClassInfo(item.classGroup)) ?? [];
  const coveredClasses = entry.coveredClasses.map((item) => mapClassInfo(item.schoolClass));
  const parentClass =
    entry.deliveryGroup?.type === "SUBJECT_SUBGROUP" && entry.deliveryGroup.parentGroup
      ? mapClassInfo(entry.deliveryGroup.parentGroup)
      : entry.deliveryGroup?.type === "CLASS"
        ? mapClassInfo(entry.deliveryGroup)
        : null;
  const projectedClasses = getProjectedClasses(entry);
  const resolveRequirementMeta = (projectedClassId: string) => {
    const requirementGroupId = getRequirementMetaGroupId(entry, projectedClassId);

    return requirementGroupId
      ? requirementMetaByGroupSubject[`${requirementGroupId}:${entry.subjectId}`] ?? null
      : null;
  };

  return projectedClasses.map((projectedClass) => ({
    id: `${entry.id}:${projectedClass.id}`,
    templateId: entry.id,
    projectionClassId: projectedClass.id,
    deliveryMode: entry.deliveryMode,
    deliveryGroupId: entry.deliveryGroup?.id ?? null,
    deliveryGroupType: entry.deliveryGroup?.type ?? null,
    openClassIds: openClasses.map((item) => item.id),
    coveredClassIds: entry.coveredClasses.map((item) => item.classGroupId),
    openClasses,
    coveredClasses,
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
    groupName,
    deliveryGroupStudentCount: entry.deliveryGroup?._count.studentGroups ?? null,
    parentClassId: parentClass?.id ?? null,
    parentClassName: parentClass?.name ?? null,
    parentClassGrade: parentClass?.grade ?? null,
    parentClassStudentCount: parentClass?.studentCount ?? null,
    minimumBreakAfterMinutes: resolveRequirementMeta(projectedClass.id)?.breakDuration ?? null,
    classId: projectedClass.id,
    className: projectedClass.name,
    groupType: entry.deliveryGroup?.type ?? projectedClass.type,
    timeLabel: `${format(entry.startTime, "HH:mm")}-${format(entry.endTime, "HH:mm")}`,
    metaLine: `${teacherName} • ${roomName}`,
  }));
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

function getRequirementMetaGroupId(
  entry: ScheduleEntryRecord,
  projectedClassId: string,
) {
  if (entry.deliveryMode === "SHARED_CLASSES") {
    return projectedClassId;
  }

  if (
    entry.deliveryMode === "DIRECT_GROUP"
    && entry.deliveryGroup?.type === "SUBJECT_SUBGROUP"
    && entry.deliveryGroup.parentGroup?.id
  ) {
    return entry.deliveryGroup.parentGroup.id;
  }

  return entry.deliveryGroup?.id ?? null;
}

type ClassInfo = {
  id: string;
  name: string;
  grade: number | null;
  studentCount: number;
  type: GroupType;
};

function mapClassInfo(group: {
  id: string;
  name: string;
  grade: number | null;
  type: GroupType;
  _count?: { studentGroups: number };
}): ClassInfo {
  return {
    id: group.id,
    name: group.name,
    grade: group.grade ?? null,
    studentCount: group._count?.studentGroups ?? 0,
    type: group.type,
  };
}

function getProjectedClasses(entry: ScheduleEntryRecord): ClassInfo[] {
  if (entry.deliveryMode === "ELECTIVE_GROUP") {
    return entry.deliveryGroup?.electiveClassLinks
      .map((item) => mapClassInfo(item.classGroup))
      .sort((left, right) => left.name.localeCompare(right.name, "ru"))
      ?? [];
  }

  if (entry.deliveryMode === "SHARED_CLASSES") {
    return entry.coveredClasses
      .map((item) => mapClassInfo(item.schoolClass))
      .sort((left, right) => left.name.localeCompare(right.name, "ru"));
  }

  if (!entry.deliveryGroup) {
    return [];
  }

  if (entry.deliveryGroup.type === "SUBJECT_SUBGROUP" && entry.deliveryGroup.parentGroup) {
    return [mapClassInfo(entry.deliveryGroup.parentGroup)];
  }

  return [mapClassInfo(entry.deliveryGroup)];
}

function getGroupLabel(entry: ScheduleEntryRecord) {
  if (entry.deliveryMode === "SHARED_CLASSES") {
    return entry.coveredClasses
      .map((item) => item.schoolClass.name)
      .sort((left, right) => left.localeCompare(right, "ru"))
      .join(" + ");
  }

  return entry.deliveryGroup?.name ?? "Группа не указана";
}
