import { getScheduleRange } from "@/features/schedule/lib/query-params";
import type { ScheduleViewMode } from "@/features/schedule/lib/types";
import type { Prisma } from "@/generated/prisma/client";
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
  includeAvailableOptionalElectives?: boolean;
}

export interface GetStudentScheduleEventsResult {
  events: StudentScheduleEvent[];
}

const VISIBLE_GROUP_TYPES: GroupType[] = ["CLASS", "SUBJECT_SUBGROUP", "ELECTIVE_GROUP"];

export async function getStudentScheduleEvents({
  studentId,
  anchorDate,
  viewMode,
  includeAvailableOptionalElectives = false,
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
  const visibilityConditions: Prisma.ScheduleEntryWhereInput[] = [
    {
      deliveryGroupId: { in: groupIds },
    },
    {
      coveredClasses: {
        some: {
          classGroupId: classId,
        },
      },
    },
  ];

  if (includeAvailableOptionalElectives) {
    visibilityConditions.push({
      subject: {
        type: "ELECTIVE_OPTIONAL",
      },
      deliveryGroup: {
        type: "ELECTIVE_GROUP",
        electiveClassLinks: {
          some: {
            classGroupId: classId,
          },
        },
      },
    });
  }

  const scheduleEntries = await prisma.scheduleEntry.findMany({
    where: {
      OR: visibilityConditions,
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
