import { format } from "date-fns";

import { getScheduleRange } from "@/features/schedule";
import { getMinutesSinceStartOfDay } from "@/features/schedule/lib/date-utils";
import { Prisma } from "@/generated/prisma/client";
import type { GroupType } from "@/generated/prisma/enums";
import { getUserFullName } from "@/lib/auth-access";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/server-action-auth";

import type { AdminScheduleEvent } from "../../_lib/admin-schedule-types";
import {
  AdminScheduleEntriesPageData,
  AdminScheduleEntriesScope, GetAdminScheduleEntriesPageDataParams
} from "@/app/(dashboard)/admin/schedule/entries/_lib/types";
import {
  GROUP_TYPE_LABELS,
  MISSING_ROOM_LABEL,
  MISSING_TEACHER_LABEL
} from "@/app/(dashboard)/admin/schedule/entries/_lib/constants";

const scheduleEntryInclude = {
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

type ScheduleEntryRecord = Prisma.ScheduleEntryGetPayload<{
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
    events: scheduleEntries.map(mapScheduleEntryToAdminScheduleEvent),
  };
}

function mapScheduleEntryToAdminScheduleEvent(
  entry: ScheduleEntryRecord,
): AdminScheduleEvent {
  const teacherName = entry.teacher?.user
    ? getUserFullName(entry.teacher.user) || MISSING_TEACHER_LABEL
    : MISSING_TEACHER_LABEL;
  const roomName = entry.room?.name ?? MISSING_ROOM_LABEL;
  const groupName = getGroupLabel(entry);
  const coveredClasses = entry.coveredClasses.map((item) => mapClassInfo(item.schoolClass));
  const primaryClass = getPrimaryClass(entry);
  const parentClass =
    entry.deliveryGroup?.type === "SUBJECT_SUBGROUP" && entry.deliveryGroup.parentGroup
      ? mapClassInfo(entry.deliveryGroup.parentGroup)
      : entry.deliveryGroup?.type === "CLASS"
        ? mapClassInfo(entry.deliveryGroup)
        : null;

  return {
    id: entry.id,
    templateId: entry.templateId ?? entry.id,
    projectionClassId: primaryClass.id,
    deliveryMode: entry.deliveryMode,
    deliveryGroupId: entry.deliveryGroup?.id ?? null,
    deliveryGroupType: entry.deliveryGroup?.type ?? null,
    openClassIds: [],
    coveredClassIds: entry.coveredClasses.map((item) => item.classGroupId),
    openClasses: [],
    coveredClasses,
    start: entry.startTime,
    end: entry.endTime,
    dayOfWeek: null,
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
    classId: primaryClass.id,
    className: primaryClass.name,
    groupType: entry.deliveryGroup?.type ?? primaryClass.type,
    timeLabel: `${format(entry.startTime, "HH:mm")}-${format(entry.endTime, "HH:mm")}`,
    metaLine: `${teacherName} • ${roomName}`,
  };
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

function getPrimaryClass(entry: ScheduleEntryRecord): ClassInfo {
  return getProjectedClasses(entry)[0] ?? {
    id: entry.deliveryGroup?.id ?? entry.id,
    name: entry.deliveryGroup?.name ?? "Группа не указана",
    grade: entry.deliveryGroup?.grade ?? null,
    studentCount: entry.deliveryGroup?._count.studentGroups ?? 0,
    type: entry.deliveryGroup?.type ?? "CLASS",
  };
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
