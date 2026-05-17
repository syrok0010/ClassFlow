import { parseScheduleDate, parseScheduleView } from "@/features/schedule";

import { TeacherScheduleView } from "./_components/teacher-schedule-view";
import { getTeacherSchedulePageData } from "./_lib/get-teacher-schedule-page-data";
import {format} from "date-fns";
import {redirect} from "next/navigation";

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

  const hasInvalidView =
      searchParams.view !== undefined &&
      searchParams.view !== "day" &&
      searchParams.view !== "week";

  const hasInvalidDate =
      searchParams.date !== undefined &&
      (typeof searchParams.date !== "string" ||
          format(anchorDate, "yyyy-MM-dd") !== searchParams.date);

  if (hasInvalidDate || hasInvalidView)
    redirect(`/teacher/schedule?date=${format(anchorDate, "yyyy-MM-dd")}`);

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
