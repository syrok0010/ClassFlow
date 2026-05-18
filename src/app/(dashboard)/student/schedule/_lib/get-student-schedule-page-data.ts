import { format } from "date-fns";

import { getScheduleRange, type ScheduleViewMode } from "@/features/schedule";
import type { GroupType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireStudentActor } from "@/lib/server-action-auth";

import {
  mapScheduleEntryToStudentScheduleEvent,
  studentScheduleEntryInclude,
} from "./student-schedule-mapper";
import type { StudentSchedulePageData } from "./student-schedule-types";

type StudentScheduleSearchParams = {
  viewMode: ScheduleViewMode;
  anchorDate: Date;
};

const VISIBLE_GROUP_TYPES: GroupType[] = ["CLASS", "SUBJECT_SUBGROUP", "ELECTIVE_GROUP"];

export async function getStudentSchedulePageData({
  viewMode,
  anchorDate,
}: StudentScheduleSearchParams): Promise<StudentSchedulePageData> {
  const actor = await requireStudentActor();

  const dateParam = format(anchorDate, "yyyy-MM-dd");

  const studentGroups = await prisma.studentGroups.findMany({
    where: {
      studentId: actor.studentId,
      group: {
        type: {
          in: VISIBLE_GROUP_TYPES,
        },
      },
    },
    select: {
      groupId: true,
      group: {
        select: {
          type: true,
        },
      },
    },
  });

  const groupIds = studentGroups.map((membership) => membership.groupId);
  const classId = studentGroups.find((membership) => membership.group.type === "CLASS")?.groupId ?? null;

  if (groupIds.length === 0 || !classId) {
    return {
      anchorDate,
      dateParam,
      viewMode,
      events: [],
    };
  }

  const { rangeStart, rangeEnd } = getScheduleRange(anchorDate, viewMode);
  const scheduleEntries = await prisma.scheduleEntry.findMany({
    where: {
      OR: [
        {
          deliveryGroupId: {
            in: groupIds,
          },
        },
        {
          coveredClasses: {
            some: {
              classGroupId: classId,
            },
          },
        },
      ],
      startTime: {
        gte: rangeStart,
        lt: rangeEnd,
      },
    },
    include: studentScheduleEntryInclude,
    orderBy: [{ startTime: "asc" }, { endTime: "asc" }, { id: "asc" }],
  });

  return {
    anchorDate,
    dateParam,
    viewMode,
    events: scheduleEntries.map(mapScheduleEntryToStudentScheduleEvent),
  };
}
