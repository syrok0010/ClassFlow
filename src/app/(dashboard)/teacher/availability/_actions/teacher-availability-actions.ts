"use server";

import { startOfWeek } from "date-fns";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import { getActionErrorMessage } from "@/lib/action-error";
import { requireTeacherActor } from "@/lib/server-action-auth";
import {
  type CreateTeacherAvailabilityOverrideInput,
  type UpdateTeacherAvailabilityOverrideInput,
  createTeacherAvailabilityOverrideSchema,
  deleteTeacherAvailabilityOverrideSchema,
  updateTeacherAvailabilityOverrideSchema,
  teacherAvailabilityEntrySchema,
} from "@/features/availability/lib/schemas";
import { getTeacherAvailabilityPageData } from "@/features/availability/lib/page-data";
import { normalizeTemplateEntries } from "@/features/availability/lib/utils";

const TEACHER_AVAILABILITY_PATH = "/teacher/availability";

export async function getTeacherAvailabilityAction(
  weekStart: Date,
): Promise<Result<Awaited<ReturnType<typeof getTeacherAvailabilityPageData>>>> {
  try {
    const actor = await requireTeacherActor();
    const normalizedWeekStart = startOfWeek(weekStart, { weekStartsOn: 1 });
    return ok(await getTeacherAvailabilityPageData(normalizedWeekStart, actor.teacherId));
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось загрузить вашу доступность"));
  }
}

export async function upsertTeacherAvailabilityAction(input: {
  entries: Array<{
    dayOfWeek: number;
    startTime: number;
    endTime: number;
    type: "PREFERRED" | "AVAILABLE" | "UNAVAILABLE";
  }>;
}): Promise<Result<Awaited<ReturnType<typeof getTeacherAvailabilityPageData>>>> {
  try {
    const actor = await requireTeacherActor();
    const validatedEntries = input.entries.map((entry) => teacherAvailabilityEntrySchema.parse(entry));
    const normalizedEntries = normalizeTemplateEntries(validatedEntries);

    await prisma.$transaction(async (tx) => {
      await tx.teacherAvailability.deleteMany({
        where: { teacherId: actor.teacherId },
      });

      if (normalizedEntries.length > 0) {
        await tx.teacherAvailability.createMany({
          data: normalizedEntries.map((entry) => ({
            teacherId: actor.teacherId,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            type: entry.type,
          })),
        });
      }
    });

    revalidatePath(TEACHER_AVAILABILITY_PATH);
    return ok(
      await getTeacherAvailabilityPageData(startOfWeek(new Date(), { weekStartsOn: 1 }), actor.teacherId),
    );
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось сохранить недельный шаблон"));
  }
}

export async function createTeacherAvailabilityOverrideAction(
  input: Pick<CreateTeacherAvailabilityOverrideInput, "startTime" | "endTime" | "type">,
): Promise<Result<Awaited<ReturnType<typeof getTeacherAvailabilityPageData>>>> {
  try {
    const actor = await requireTeacherActor();
    const validated = createTeacherAvailabilityOverrideSchema.parse({
      ...input,
      teacherId: actor.teacherId,
    });

    await prisma.teacherAvailabilityOverride.create({
      data: {
        teacherId: actor.teacherId,
        startTime: validated.startTime,
        endTime: validated.endTime,
        type: validated.type,
      },
    });

    revalidatePath(TEACHER_AVAILABILITY_PATH);
    return ok(
      await getTeacherAvailabilityPageData(startOfWeek(new Date(), { weekStartsOn: 1 }), actor.teacherId),
    );
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось создать исключение"));
  }
}

export async function updateTeacherAvailabilityOverrideAction(
  input: Pick<UpdateTeacherAvailabilityOverrideInput, "overrideId" | "startTime" | "endTime" | "type">,
): Promise<Result<Awaited<ReturnType<typeof getTeacherAvailabilityPageData>>>> {
  try {
    const actor = await requireTeacherActor();
    const validated = updateTeacherAvailabilityOverrideSchema.parse({
      ...input,
      teacherId: actor.teacherId,
    });

    const existing = await prisma.teacherAvailabilityOverride.findUnique({
      where: { id: validated.overrideId },
      select: { id: true, teacherId: true },
    });

    if (!existing || existing.teacherId !== actor.teacherId) {
      return err("Исключение не найдено");
    }

    await prisma.teacherAvailabilityOverride.update({
      where: { id: validated.overrideId },
      data: {
        startTime: validated.startTime,
        endTime: validated.endTime,
        type: validated.type,
      },
    });

    revalidatePath(TEACHER_AVAILABILITY_PATH);
    return ok(
      await getTeacherAvailabilityPageData(startOfWeek(new Date(), { weekStartsOn: 1 }), actor.teacherId),
    );
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось обновить исключение"));
  }
}

export async function deleteTeacherAvailabilityOverrideAction(
  input: { overrideId: string },
): Promise<Result<Awaited<ReturnType<typeof getTeacherAvailabilityPageData>>>> {
  try {
    const actor = await requireTeacherActor();
    const validated = deleteTeacherAvailabilityOverrideSchema.parse({
      ...input,
      teacherId: actor.teacherId,
    });

    const existing = await prisma.teacherAvailabilityOverride.findUnique({
      where: { id: validated.overrideId },
      select: { id: true, teacherId: true },
    });

    if (!existing || existing.teacherId !== actor.teacherId) {
      return err("Исключение не найдено");
    }

    await prisma.teacherAvailabilityOverride.delete({
      where: { id: validated.overrideId },
    });

    revalidatePath(TEACHER_AVAILABILITY_PATH);
    return ok(
      await getTeacherAvailabilityPageData(startOfWeek(new Date(), { weekStartsOn: 1 }), actor.teacherId),
    );
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось удалить исключение"));
  }
}
