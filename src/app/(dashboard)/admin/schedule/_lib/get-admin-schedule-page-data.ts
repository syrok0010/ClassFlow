import { startOfWeek } from "date-fns";

import type { GroupType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/server-action-auth";

import {
  adminScheduleTemplateInclude,
  mapWeeklyTemplateToAdminScheduleEvent,
} from "./admin-schedule-mapper";
import type { AdminSchedulePageData } from "./admin-schedule-types";

const VISIBLE_CLASS_TYPES: GroupType[] = ["CLASS"];

export async function getAdminSchedulePageData({
  anchorDate,
}: {
  anchorDate: Date;
}): Promise<AdminSchedulePageData> {
  await requireAdminContext();

  const anchorWeekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });

  const classRows = await prisma.group.findMany({
    where: {
      type: {
        in: VISIBLE_CLASS_TYPES,
      },
    },
    select: {
      id: true,
      name: true,
      grade: true,
    },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
  });

  if (classRows.length === 0) {
    return {
      anchorDate,
      events: [],
      classRows: [],
    };
  }

  const classIds = classRows.map((row) => row.id);

  const templates = await prisma.weeklyScheduleTemplate.findMany({
    where: {
      OR: [
        {
          groupId: {
            in: classIds,
          },
        },
        {
          group: {
            parentId: {
              in: classIds,
            },
            type: "SUBJECT_SUBGROUP",
          },
        },
      ],
    },
    include: adminScheduleTemplateInclude,
    orderBy: [
      { dayOfWeek: "asc" },
      { startTime: "asc" },
      { endTime: "asc" },
      { id: "asc" },
    ],
  });

  return {
    anchorDate,
    events: templates.map((entry) => mapWeeklyTemplateToAdminScheduleEvent(entry, anchorWeekStart)),
    classRows,
  };
}
