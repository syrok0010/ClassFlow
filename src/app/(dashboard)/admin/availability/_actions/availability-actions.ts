"use server";

import { startOfWeek } from "date-fns";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActionErrorMessage } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import {
  createTeacherAvailabilityOverrideSchema,
  deleteTeacherAvailabilityOverrideSchema,
  updateTeacherAvailabilityOverrideSchema,
  upsertTeacherAvailabilitySchema,
} from "@/features/availability/lib/schemas";
import type { AvailabilityWeekData } from "@/features/availability/lib/types";
import { getAdminAvailabilityWeekData } from "@/features/availability/lib/page-data";
import { normalizeTemplateEntries } from "@/features/availability/lib/utils";

const ADMIN_AVAILABILITY_PATH = "/admin/availability";

async function ensureAdminAccess(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }
}

export async function getAdminAvailabilityWeekDataAction(
  weekStart: Date,
): Promise<Result<AvailabilityWeekData>> {
  await ensureAdminAccess();

  try {
    const normalizedWeekStart = startOfWeek(weekStart, { weekStartsOn: 1 });
    return ok(await getAdminAvailabilityWeekData(normalizedWeekStart));
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось загрузить матрицу доступности"));
  }
}

export async function upsertTeacherAvailabilityAction(
  input: Parameters<typeof upsertTeacherAvailabilitySchema.parse>[0],
): Promise<Result<AvailabilityWeekData>> {
  await ensureAdminAccess();

  try {
    const validated = upsertTeacherAvailabilitySchema.parse(input);

    const teacher = await prisma.teacher.findUnique({
      where: { id: validated.teacherId },
      select: { id: true },
    });

    if (!teacher) {
      return err("Преподаватель не найден");
    }

    const normalizedEntries = normalizeTemplateEntries(validated.entries);

    await prisma.$transaction(async (tx) => {
      await tx.teacherAvailability.deleteMany({
        where: { teacherId: validated.teacherId },
      });

      if (normalizedEntries.length > 0) {
        await tx.teacherAvailability.createMany({
          data: normalizedEntries.map((entry) => ({
            teacherId: validated.teacherId,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            type: entry.type,
          })),
        });
      }
    });

    revalidatePath(ADMIN_AVAILABILITY_PATH);
    return ok(await getAdminAvailabilityWeekData(startOfWeek(new Date(), { weekStartsOn: 1 })));
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось сохранить недельный шаблон"));
  }
}

export async function createTeacherAvailabilityOverrideAction(
  input: Parameters<typeof createTeacherAvailabilityOverrideSchema.parse>[0],
): Promise<Result<AvailabilityWeekData>> {
  await ensureAdminAccess();

  try {
    const validated = createTeacherAvailabilityOverrideSchema.parse(input);

    await prisma.teacherAvailabilityOverride.create({
      data: {
        teacherId: validated.teacherId,
        startTime: validated.startTime,
        endTime: validated.endTime,
        type: validated.type,
      },
    });

    revalidatePath(ADMIN_AVAILABILITY_PATH);
    return ok(await getAdminAvailabilityWeekData(startOfWeek(new Date(), { weekStartsOn: 1 })));
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось создать исключение"));
  }
}

export async function updateTeacherAvailabilityOverrideAction(
  input: Parameters<typeof updateTeacherAvailabilityOverrideSchema.parse>[0],
): Promise<Result<AvailabilityWeekData>> {
  await ensureAdminAccess();

  try {
    const validated = updateTeacherAvailabilityOverrideSchema.parse(input);

    const existing = await prisma.teacherAvailabilityOverride.findUnique({
      where: { id: validated.overrideId },
      select: { id: true, teacherId: true },
    });

    if (!existing || existing.teacherId !== validated.teacherId) {
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

    revalidatePath(ADMIN_AVAILABILITY_PATH);
    return ok(await getAdminAvailabilityWeekData(startOfWeek(new Date(), { weekStartsOn: 1 })));
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось обновить исключение"));
  }
}

export async function deleteTeacherAvailabilityOverrideAction(
  input: Parameters<typeof deleteTeacherAvailabilityOverrideSchema.parse>[0],
): Promise<Result<AvailabilityWeekData>> {
  await ensureAdminAccess();

  try {
    const validated = deleteTeacherAvailabilityOverrideSchema.parse(input);

    const existing = await prisma.teacherAvailabilityOverride.findUnique({
      where: { id: validated.overrideId },
      select: { id: true, teacherId: true },
    });

    if (!existing || existing.teacherId !== validated.teacherId) {
      return err("Исключение не найдено");
    }

    await prisma.teacherAvailabilityOverride.delete({
      where: { id: validated.overrideId },
    });

    revalidatePath(ADMIN_AVAILABILITY_PATH);
    return ok(await getAdminAvailabilityWeekData(startOfWeek(new Date(), { weekStartsOn: 1 })));
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось удалить исключение"));
  }
}
