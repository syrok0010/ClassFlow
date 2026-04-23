"use server";

import { addDays, startOfWeek } from "date-fns";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserFullName } from "@/lib/auth-access";
import { getActionErrorMessage } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import {
  createTeacherAvailabilityOverrideSchema,
  deleteTeacherAvailabilityOverrideSchema,
  updateTeacherAvailabilityOverrideSchema,
  upsertTeacherAvailabilitySchema,
  type CreateTeacherAvailabilityOverrideInput,
  type DeleteTeacherAvailabilityOverrideInput,
  type UpdateTeacherAvailabilityOverrideInput,
  type UpsertTeacherAvailabilityInput,
} from "../_lib/schemas";
import type { AdminAvailabilityWeekData } from "../_lib/types";
import {
  normalizeTemplateEntries,
} from "../_lib/utils";

const ADMIN_AVAILABILITY_PATH = "/admin/availability";

async function ensureAdminAccess(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user || session.user.role !== "ADMIN") {
    notFound();
  }
}

async function getWeekData(weekStart: Date): Promise<AdminAvailabilityWeekData> {
  const teachers = await prisma.teacher.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          surname: true,
          name: true,
          patronymicName: true,
        },
      },
      teacherAvailabilities: {
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          type: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      teacherAvailabilityOverrides: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          type: true,
        },
        orderBy: [{ startTime: "asc" }],
      },
    },
    orderBy: [{ user: { surname: "asc" } }, { user: { name: "asc" } }],
  });

  return {
    weekStart,
    weekEnd: addDays(weekStart, 7),
    teachers: teachers.map((teacher) => ({
      teacherId: teacher.id,
      userId: teacher.user.id,
      fullName: getUserFullName(teacher.user) || teacher.user.email || "Без имени",
      email: teacher.user.email,
      templateEntries: teacher.teacherAvailabilities.map((entry) => ({
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        type: entry.type,
      })),
      overrides: teacher.teacherAvailabilityOverrides.map((entry) => ({
        id: entry.id,
        startTime: entry.startTime,
        endTime: entry.endTime,
        type: entry.type,
      })),
    })),
  };
}

export async function getAdminAvailabilityWeekDataAction(
  weekStart: Date,
): Promise<Result<AdminAvailabilityWeekData>> {
  await ensureAdminAccess();

  try {
    const normalizedWeekStart = startOfWeek(weekStart, { weekStartsOn: 1 });
    return ok(await getWeekData(normalizedWeekStart));
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось загрузить матрицу доступности"));
  }
}

export async function upsertTeacherAvailabilityAction(
  input: UpsertTeacherAvailabilityInput,
): Promise<Result<AdminAvailabilityWeekData>> {
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
    return ok(
      await getWeekData(startOfWeek(new Date(), { weekStartsOn: 1 })),
    );
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось сохранить недельный шаблон"));
  }
}

export async function createTeacherAvailabilityOverrideAction(
  input: CreateTeacherAvailabilityOverrideInput,
): Promise<Result<AdminAvailabilityWeekData>> {
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
    return ok(
      await getWeekData(startOfWeek(new Date(), { weekStartsOn: 1 })),
    );
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось создать исключение"));
  }
}

export async function updateTeacherAvailabilityOverrideAction(
  input: UpdateTeacherAvailabilityOverrideInput,
): Promise<Result<AdminAvailabilityWeekData>> {
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
    return ok(
      await getWeekData(startOfWeek(new Date(), { weekStartsOn: 1 })),
    );
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось обновить исключение"));
  }
}

export async function deleteTeacherAvailabilityOverrideAction(
  input: DeleteTeacherAvailabilityOverrideInput,
): Promise<Result<AdminAvailabilityWeekData>> {
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
    return ok(
      await getWeekData(startOfWeek(new Date(), { weekStartsOn: 1 })),
    );
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось удалить исключение"));
  }
}
