import { parseScheduleDate, parseScheduleView } from "@/features/schedule";

import { TeacherScheduleView } from "./_components/teacher-schedule-view";
import { getTeacherSchedulePageData } from "./_lib/get-teacher-schedule-page-data";

export const dynamic = "force-dynamic";

export default async function TeacherSchedulePage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const viewMode = parseScheduleView(searchParams.view);
  const anchorDate = parseScheduleDate(searchParams.date);
  const pageData = await getTeacherSchedulePageData({
    anchorDate,
    viewMode,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Мое расписание</h1>
        <p className="text-sm text-muted-foreground">
          Фактические занятия на выбранный день или неделю.
        </p>
      </div>

      <TeacherScheduleView {...pageData} />
    </div>
  );
}
