import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createParentInviteForStudent } from "@/features/users/invites";
import { getActionContext } from "@/lib/server-action-auth";

const createParentInviteRequestSchema = z.object({
  studentId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const context = await getActionContext();

  if (!context) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  if (context.systemRole !== "ADMIN") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = createParentInviteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный ID ученика" }, { status: 400 });
  }

  const result = await createParentInviteForStudent(parsed.data.studentId);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result.result);
}
