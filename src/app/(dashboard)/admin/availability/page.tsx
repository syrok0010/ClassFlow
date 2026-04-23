import { parseISO, startOfWeek } from "date-fns";
import { AlertTriangle } from "lucide-react";
import {
  getAdminAvailabilityWeekDataAction,
} from "./_actions/availability-actions";
import { AdminAvailabilityPageClient } from "./_components/admin-availability-page-client";

export const dynamic = "force-dynamic";

export default async function AdminAvailabilityPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const weekStart = typeof searchParams.weekStart === "string"
    ? parseISO(searchParams.weekStart)
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const response = await getAdminAvailabilityWeekDataAction(weekStart);

  if (response.error || !response.result) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4">
        <div className="w-full rounded-2xl border bg-card p-8 text-card-foreground shadow-sm">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Не удалось открыть экран доступности
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Проверьте права доступа и состояние данных преподавателей.
          </p>

          <div className="mt-5 rounded-lg border bg-muted/40 p-3">
            <p className="text-sm text-foreground">• {response.error ?? "Неизвестная ошибка"}</p>
          </div>
        </div>
      </div>
    );
  }

  return <AdminAvailabilityPageClient initialData={response.result} />;
}
