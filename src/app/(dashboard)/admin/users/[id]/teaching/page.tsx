import Link from "next/link";
import type { UserStatus } from "@/generated/prisma/enums";
import { getTeacherSubjectsAction } from "@/features/teacher-subjects/actions/teacher-subject-actions";
import { TeacherSubjectsEditor } from "@/features/teacher-subjects/components/teacher-subjects-editor";
import { TeacherSubjectsPageError } from "@/features/teacher-subjects/components/teacher-subjects-page-error";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeacherSubjectsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacherProfile = await prisma.teacher.findFirst({
    where: { userId: id },
    select: { id: true },
  });

  if (!teacherProfile) {
    return (
      <TeacherSubjectsPageError
        title="Не удалось открыть страницу компетенций"
        description="Проверьте, что выбран пользователь с ролью преподавателя."
        message="У пользователя нет роли преподавателя"
        retryHref="/admin/users"
        retryLabel="Вернуться к пользователям"
      />
    );
  }

  const response = await getTeacherSubjectsAction({ teacherId: teacherProfile.id });

  if (response.error || !response.result) {
    return (
      <TeacherSubjectsPageError
        title="Не удалось открыть страницу компетенций"
        description="Проверьте, что выбран пользователь с ролью преподавателя."
        message={response.error ?? "Неизвестная ошибка"}
        retryHref="/admin/users"
        retryLabel="Вернуться к пользователям"
      />
    );
  }

  const { teacher } = response.result;

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link className="hover:text-foreground" href="/admin/users">
            Пользователи
          </Link>{" "}
          / <span>{teacher.fullName}</span> / <span>Компетенции</span>
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Компетенции преподавателя</h1>
        <p className="text-sm text-muted-foreground">
          {teacher.fullName} · {teacher.email ?? "email не указан"} · {teacher.roleLabels.join(", ") || "без ролей"} · {STATUS_LABELS[teacher.status] ?? "Неизвестный статус"}
        </p>
      </div>

      <TeacherSubjectsEditor initialData={response.result} />
    </div>
  );
}

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Активен",
  PENDING_INVITE: "Ожидает инвайт",
  DISABLED: "Заблокирован",
};
