"use server";

import { z } from "zod/v4";
import { getActionErrorMessage } from "@/lib/action-error";
import { err, ok, type Result } from "@/lib/result";
import { requireParentActor } from "@/lib/server-action-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const enrollInElectiveSchema = z.object({
  studentId: z.string().min(1),
  scheduleEntryId: z.string().min(1),
});

export async function enrollChildInElectiveAction(
  studentId: string,
  scheduleEntryId: string,
): Promise<Result<{ groupId: string }>> {
  const actor = await requireParentActor();

  try {
    const validated = enrollInElectiveSchema.parse({ studentId, scheduleEntryId });

    const studentParent = await prisma.studentParents.findUnique({
      where: {
        parentId_studentId: {
          parentId: actor.parentId,
          studentId: validated.studentId,
        },
      },
      select: { studentId: true },
    });

    if (!studentParent) {
      return err("Этот ребенок не привязан к вашему профилю");
    }

    const entry = await prisma.scheduleEntry.findUnique({
      where: { id: validated.scheduleEntryId },
      select: {
        id: true,
        subjectId: true,
        subject: {
          select: {
            type: true,
          },
        },
        deliveryGroup: {
          select: {
            id: true,
            type: true,
            subjectId: true,
          },
        },
      },
    });

    if (!entry) {
      return err("Занятие не найдено");
    }

    if (entry.subject.type !== "ELECTIVE_OPTIONAL") {
      return err("Запись доступна только для допов по выбору");
    }

    if (!entry.deliveryGroup || entry.deliveryGroup.type !== "ELECTIVE_GROUP") {
      return err("Для этого занятия не настроена группа посещения");
    }

    if (entry.deliveryGroup.subjectId !== entry.subjectId) {
      return err("Группа кружка привязана к другому допу");
    }

    const linkedClassRows = await prisma.electiveGroupClassLink.findMany({
      where: { electiveGroupId: entry.deliveryGroup.id },
      select: { classGroupId: true },
    });
    const linkedClassIds = linkedClassRows.map((item) => item.classGroupId);

    if (linkedClassIds.length === 0) {
      return err("Для этого кружка не настроены доступные классы");
    }

    const eligibleMembership = await prisma.studentGroups.findFirst({
      where: {
        studentId: validated.studentId,
        groupId: { in: linkedClassIds },
      },
      select: { studentId: true },
    });

    if (!eligibleMembership) {
      return err("Ребенок не относится к классам, которым доступен этот доп");
    }

    await prisma.studentGroups.createMany({
      data: [
        {
          studentId: validated.studentId,
          groupId: entry.deliveryGroup.id,
        },
      ],
      skipDuplicates: true,
    });

    revalidatePath("/parent/schedule");
    revalidatePath("/admin/groups");

    return ok({ groupId: entry.deliveryGroup.id });
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось записать ребенка на доп"));
  }
}
