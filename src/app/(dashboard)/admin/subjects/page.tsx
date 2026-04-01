import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getSubjectsAction } from "./_actions/subject-actions";
import { SubjectsTableClient } from "./_components/subjects-table-client";

export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const subjectsResponse = await getSubjectsAction();

  if (subjectsResponse.error) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4">
        <div className="w-full rounded-2xl border bg-card p-8 text-card-foreground shadow-sm">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Не удалось загрузить справочник предметов
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Произошла ошибка на стороне сервера. Попробуйте обновить страницу.
          </p>

          <div className="mt-5 space-y-2 rounded-lg border bg-muted/40 p-3">
            <p className="text-sm text-foreground">• {subjectsResponse.error}</p>
          </div>

          <div className="mt-6 flex gap-2">
            <Link
              href="/admin/subjects"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Обновить страницу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <SubjectsTableClient initialSubjects={subjectsResponse.result ?? []} />;
}
