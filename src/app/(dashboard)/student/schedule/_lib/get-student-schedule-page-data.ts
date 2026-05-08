import { format } from "date-fns";

import type { ScheduleViewMode } from "@/features/schedule/lib/types";
import { getStudentScheduleEvents } from "@/features/schedule/student/get-student-schedule-events";
import type { StudentSchedulePageData } from "@/features/schedule/student/student-schedule-types";
import { requireStudentActor } from "@/lib/server-action-auth";

type StudentScheduleSearchParams = {
  viewMode: ScheduleViewMode;
  anchorDate: Date;
};

export async function getStudentSchedulePageData({
  viewMode,
  anchorDate,
}: StudentScheduleSearchParams): Promise<StudentSchedulePageData> {
  const actor = await requireStudentActor();
  const dateParam = format(anchorDate, "yyyy-MM-dd");
  const schedule = await getStudentScheduleEvents({
    studentId: actor.studentId,
    anchorDate,
    viewMode,
  });

  return {
    anchorDate,
    dateParam,
    viewMode,
    events: schedule.events,
  };
}
