import { format } from "date-fns";

import { getScheduleRange } from "@/features/schedule";
import { Prisma } from "@/generated/prisma/client";
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
  group: { select: { id: true, name: true, type: true } },
  teacher: {
    select: {
      id: true,
      user: { select: { surname: true, name: true, patronymicName: true } },
    },
  },
  room: { select: { id: true, name: true } },
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
      ...(scope === "group" ? { groupId: selectedTarget.id } : {}),
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

  return {
    id: entry.id,
    start: entry.startTime,
    end: entry.endTime,
    subjectId: entry.subject.id,
    teacherId: entry.teacher?.id ?? null,
    roomId: entry.room?.id ?? null,
    classId: entry.group.id,
    className: entry.group.name,
    groupName: entry.group.name,
    groupType: entry.group.type,
    subjectName: entry.subject.name,
    subjectType: entry.subject.type,
    teacherName,
    roomName,
    timeLabel: `${format(entry.startTime, "HH:mm")}-${format(entry.endTime, "HH:mm")}`,
    metaLine: `${teacherName} • ${roomName}`,
  };
}
