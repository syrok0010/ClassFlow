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
    },
  });

  const groupIds = studentGroups.map((membership) => membership.groupId);

  if (groupIds.length === 0) {
    return { events: [] };
  }

  const { rangeStart, rangeEnd } = getScheduleRange(anchorDate, viewMode);
  const scheduleEntries = await prisma.scheduleEntry.findMany({
    where: {
      groupId: { in: groupIds },
      startTime: {
        gte: rangeStart,
        lt: rangeEnd,
      },
    },
    include: studentScheduleEntryInclude,
    orderBy: [{ startTime: "asc" }, { endTime: "asc" }, { id: "asc" }],
  });

  return {
    events: scheduleEntries.map(mapScheduleEntryToStudentScheduleEvent),
  };
}
