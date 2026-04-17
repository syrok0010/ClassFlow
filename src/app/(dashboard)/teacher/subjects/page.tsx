import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTeacherSubjectsAction } from "@/features/teacher-subjects/actions/teacher-subject-actions";
import { TeacherSubjectsEditor } from "@/features/teacher-subjects/components/teacher-subjects-editor";
import { TeacherSubjectsPageError } from "@/features/teacher-subjects/components/teacher-subjects-page-error";

export const dynamic = "force-dynamic";

export default async function MySubjectsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user.domainRoles?.includes("teacher")) {
    notFound();
  }

  const response = await getTeacherSubjectsAction();

  if (response.error || !response.result) {
    return (
      <TeacherSubjectsPageError
        title="Не удалось открыть мои предметы"
        description="Проверьте, что у вас есть роль преподавателя и попробуйте обновить страницу."
        message={response.error ?? "Неизвестная ошибка"}
        retryHref="/teacher/subjects"
        retryLabel="Обновить страницу"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Мои предметы</h1>
        <p className="text-sm text-muted-foreground">
          Укажите, какие предметы и для каких классов вы ведете.
        </p>
        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          <p>Завуч использует этот список при составлении расписания и поиске замен.</p>
          <p>Если вы выбрали не тот предмет, удалите запись и создайте новую.</p>
        </div>
      </div>

      <TeacherSubjectsEditor initialData={response.result} />
    </div>
  );
}
