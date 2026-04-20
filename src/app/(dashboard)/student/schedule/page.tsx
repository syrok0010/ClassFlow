import { StudentScheduleView } from "./_components/student-schedule-view";
import { getStudentSchedulePageData } from "./_lib/get-student-schedule-page-data";

export const dynamic = "force-dynamic";

export default async function StudentSchedulePage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const pageData = await getStudentSchedulePageData(searchParams);

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Расписание уроков</h1>
        <p className="text-sm text-muted-foreground">
          Просмотр фактического расписания ученика без редактирования.
        </p>
      </div>

      <StudentScheduleView {...pageData} />
    </div>
  );
}
