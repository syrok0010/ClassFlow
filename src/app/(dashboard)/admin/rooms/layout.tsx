import { getRoomsPageDataAction } from "./_actions/room-actions";
import { RoomsWorkspace } from "./_components/rooms-workspace";
import React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default async function RoomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getRoomsPageDataAction();

  if (data.error) {
    return (
      <div className="mx-auto flex h-full w-full max-w-2xl items-center justify-center px-4">
        <div className="w-full rounded-2xl border bg-card p-8 text-card-foreground shadow-sm">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Не удалось загрузить кабинеты</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Произошла ошибка на стороне сервера. Попробуйте обновить страницу.
          </p>

          <div className="mt-5 rounded-lg border bg-muted/40 p-3">
            <p className="text-sm text-foreground">• {data.error}</p>
          </div>

          <div className="mt-6 flex gap-2">
            <Link
              href="/admin/rooms"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Обновить страницу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data.result) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4">
        <div className="w-full rounded-2xl border bg-card p-8 text-card-foreground shadow-sm">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Не удалось загрузить кабинеты</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Сервер вернул пустой ответ. Попробуйте обновить страницу.
          </p>
          <div className="mt-6 flex gap-2">
            <Link
              href="/admin/rooms"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Обновить страницу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoomsWorkspace buildings={data.result.buildings} subjects={data.result.subjects}>
      {children}
    </RoomsWorkspace>
  );
}
