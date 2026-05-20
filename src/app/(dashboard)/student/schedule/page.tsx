import { parseScheduleDate, parseScheduleView } from "@/features/schedule/lib/query-params";
import { StudentScheduleView } from "@/features/schedule/student/student-schedule-view";

import { getStudentSchedulePageData } from "./_lib/get-student-schedule-page-data";
import {format} from "date-fns";
import {redirect} from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentSchedulePage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const viewMode = parseScheduleView(searchParams.view);
  const anchorDate = parseScheduleDate(searchParams.date);
  const pageData = await getStudentSchedulePageData({
    anchorDate,
    viewMode,
  });

    const hasInvalidView =
      searchParams.view !== undefined &&
      searchParams.view !== "day" &&
      searchParams.view !== "week";

    const hasInvalidDate =
      searchParams.date !== undefined &&
      (typeof searchParams.date !== "string" ||
      format(anchorDate, "yyyy-MM-dd") !== searchParams.date);

    if (hasInvalidDate || hasInvalidView)
      redirect(`/student/schedule?date=${format(anchorDate, "yyyy-MM-dd")}`);


  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Расписание уроков</h1>
      </div>

      <StudentScheduleView {...pageData} />
    </div>
  );
}
