import { RoomDetailView } from "./_components/room-detail-view";
import { getRoomByIdAction } from "../_actions/room-actions";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const roomResponse = await getRoomByIdAction(roomId);

  if (roomResponse.error || !roomResponse.result) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4">
        <div className="w-full rounded-2xl border bg-card p-8 text-card-foreground shadow-sm">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Не удалось загрузить кабинет</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Произошла ошибка на стороне сервера. Попробуйте обновить страницу.
          </p>
          {roomResponse.error ? (
            <div className="mt-5 rounded-lg border bg-muted/40 p-3">
              <p className="text-sm text-foreground">• {roomResponse.error}</p>
            </div>
          ) : null}
          <div className="mt-6 flex gap-2">
            <Link
              href="/admin/rooms"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Назад к таблице
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <RoomDetailView room={roomResponse.result} />;
}
