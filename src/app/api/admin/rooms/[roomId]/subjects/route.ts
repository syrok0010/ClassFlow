import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRoomSubjectIds } from "@/app/(dashboard)/admin/rooms/_lib/room-queries";
import { getActionContext } from "@/lib/server-action-auth";

const paramsSchema = z.object({
  roomId: z.string().min(1),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const context = await getActionContext();

  if (!context) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  if (context.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const parsed = paramsSchema.safeParse(await params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный ID кабинета" }, { status: 400 });
  }

  const subjectIds = await getRoomSubjectIds(parsed.data.roomId);

  if (!subjectIds) {
    return NextResponse.json({ error: "Кабинет не найден" }, { status: 404 });
  }

  return NextResponse.json({ subjectIds });
}
