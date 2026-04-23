import { format } from "date-fns";

import { getScheduleRange, type ScheduleViewMode } from "@/features/schedule";
import { prisma } from "@/lib/prisma";
import { requireTeacherActor } from "@/lib/server-action-auth";

import {
  mapScheduleEntryToTeacherScheduleEvent,
  teacherScheduleEntryInclude,
} from "./teacher-schedule-mapper";
import type { TeacherSchedulePageData } from "./teacher-schedule-types";

type TeacherScheduleSearchParams = {
  viewMode: ScheduleViewMode;
  anchorDate: Date;
};

export async function getTeacherSchedulePageData({
  viewMode,
  anchorDate,
}: TeacherScheduleSearchParams): Promise<TeacherSchedulePageData> {
  const actor = await requireTeacherActor();
  const dateParam = format(anchorDate, "yyyy-MM-dd");
  const { rangeStart, rangeEnd } = getScheduleRange(anchorDate, viewMode);

  const scheduleEntries = await prisma.scheduleEntry.findMany({
    where: {
      teacherId: actor.teacherId,
      startTime: {
        gte: rangeStart,
        lt: rangeEnd,
      },
    },
    include: teacherScheduleEntryInclude,
    orderBy: [{ startTime: "asc" }, { endTime: "asc" }, { id: "asc" }],
  });

  return {
    anchorDate,
    dateParam,
    viewMode,
    events: scheduleEntries.map(mapScheduleEntryToTeacherScheduleEvent),
  };
}
