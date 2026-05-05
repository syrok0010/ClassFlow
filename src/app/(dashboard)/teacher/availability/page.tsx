import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { parseISO, startOfWeek } from "date-fns";
import { auth } from "@/lib/auth";
import { TeacherSubjectsPageError } from "@/features/teacher-subjects/components/teacher-subjects-page-error";
import { getTeacherAvailabilityAction } from "@/features/availability/actions/availability-actions";
import { TeacherAvailabilityPageClient } from "./_components/teacher-availability-page-client";

export const dynamic = "force-dynamic";

export default async function TeacherAvailabilityPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user.domainRoles?.includes("teacher")) {
    notFound();
  }

  const searchParams = await props.searchParams;
  const weekStart = typeof searchParams.weekStart === "string"
    ? parseISO(searchParams.weekStart)
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const response = await getTeacherAvailabilityAction(weekStart);

  if (response.error || !response.result) {
    return (
      <TeacherSubjectsPageError
        title="Не удалось открыть мою доступность"
        description="Проверьте, что у вас есть роль преподавателя, и попробуйте обновить страницу."
        message={response.error ?? "Неизвестная ошибка"}
        retryHref="/teacher/availability"
        retryLabel="Обновить страницу"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Моя доступность</h1>
        <p className="text-sm text-muted-foreground">
          Укажите ваш обычный график и разовые изменения. Завуч использует эти данные при
          составлении расписания и поиске замен.
        </p>
      </div>

      <TeacherAvailabilityPageClient initialData={response.result} />
    </div>
  );
}
