import { forbidden, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActionContext } from "./context";
import { requireTeacherActor } from "./domain-actors";
import type { TeacherScope } from "./types";

export async function resolveTeacherScope(requestedTeacherId?: string): Promise<TeacherScope> {
  const context = await requireActionContext();

  if (context.systemRole === "ADMIN") {
    if (!requestedTeacherId) {
      forbidden();
    }

    const teacher = await prisma.teacher.findFirst({
      where: { id: requestedTeacherId },
      select: { id: true },
    });

    if (!teacher) {
      notFound();
    }

    return {
      actorRole: "ADMIN",
      actorUserId: context.userId,
      targetTeacherId: teacher.id,
    };
  }

  const actor = await requireTeacherActor(context);

  if (requestedTeacherId && requestedTeacherId !== actor.teacherId) {
    forbidden();
  }

  return {
    actorRole: "TEACHER",
    actorUserId: context.userId,
    actorTeacherId: actor.teacherId,
    targetTeacherId: actor.teacherId,
  };
}
