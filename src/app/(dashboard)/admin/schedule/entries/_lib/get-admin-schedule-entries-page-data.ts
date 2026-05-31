import { format } from "date-fns";

import { getScheduleRange } from "@/features/schedule";
import { getUserFullName } from "@/lib/auth-access";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/server-action-auth";

import {
  AdminScheduleEntriesPageData,
  AdminScheduleEntriesScope, GetAdminScheduleEntriesPageDataParams
} from "@/app/(dashboard)/admin/schedule/entries/_lib/types";
import {
  GROUP_TYPE_LABELS,
} from "@/app/(dashboard)/admin/schedule/entries/_lib/constants";
import {
  mapScheduleEntryToAdminScheduleEvent,
  scheduleEntryInclude,
} from "./schedule-entry-mapper";

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
