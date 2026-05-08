import { parseScheduleDate, parseScheduleView } from "@/features/schedule/lib/query-params";
import { StudentScheduleView } from "@/features/schedule/student/student-schedule-view";

import { getStudentSchedulePageData } from "./_lib/get-student-schedule-page-data";

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

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Расписание уроков</h1>
      </div>

      <StudentScheduleView {...pageData} />
    </div>
  );
}
