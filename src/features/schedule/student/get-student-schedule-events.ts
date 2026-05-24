import { getScheduleRange } from "@/features/schedule/lib/query-params";
import type { ScheduleViewMode } from "@/features/schedule/lib/types";
import type { GroupType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

import {
  mapScheduleEntryToStudentScheduleEvent,
  studentScheduleEntryInclude,
} from "./student-schedule-mapper";
import type { StudentScheduleEvent } from "./student-schedule-types";

export interface GetStudentScheduleEventsParams {
  studentId: string;
  anchorDate: Date;
  viewMode: ScheduleViewMode;
}

export interface GetStudentScheduleEventsResult {
  events: StudentScheduleEvent[];
}

const VISIBLE_GROUP_TYPES: GroupType[] = ["CLASS", "SUBJECT_SUBGROUP", "ELECTIVE_GROUP"];

export async function getStudentScheduleEvents({
  studentId,
  anchorDate,
  viewMode,
}: GetStudentScheduleEventsParams): Promise<GetStudentScheduleEventsResult> {
  const studentGroups = await prisma.studentGroups.findMany({
    where: {
      studentId,
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
  const enrolledDeliveryGroupIds = new Set(groupIds);
  const classId = studentGroups.find((membership) => membership.group.type === "CLASS")?.groupId ?? null;

  if (groupIds.length === 0 || !classId) {
    return { events: [] };
  }

  const { rangeStart, rangeEnd } = getScheduleRange(anchorDate, viewMode);
  const scheduleEntries = await prisma.scheduleEntry.findMany({
    where: {
      OR: [
        {
          deliveryGroupId: { in: groupIds },
        },
        {
          deliveryGroup: {
            type: "ELECTIVE_GROUP",
            electiveClassLinks: {
              some: {
                classGroupId: classId,
              },
            },
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
    events: scheduleEntries.map((entry) =>
      mapScheduleEntryToStudentScheduleEvent(entry, enrolledDeliveryGroupIds)
    ),
  };
}
