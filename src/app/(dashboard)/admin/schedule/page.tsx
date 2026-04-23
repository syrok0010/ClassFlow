import { AdminScheduleView } from "./_components/admin-schedule-view";
import { getAdminSchedulePageData } from "./_lib/get-admin-schedule-page-data";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const pageData = await getAdminSchedulePageData();

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Шаблон расписания</h1>
        <p className="text-sm text-muted-foreground">
          Просмотр недельного шаблона по всем классам.
        </p>
      </div>

      <AdminScheduleView {...pageData} />
    </div>
  );
}
