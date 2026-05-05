"use server";

import { startOfWeek } from "date-fns";
import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import {
  requireAdminContext,
  requireTeacherActor,
  resolveTeacherScope,
  rethrowIfNextControlFlow,
} from "@/lib/server-action-auth";
import {
  type CreateTeacherAvailabilityOverrideInput,
  type DeleteTeacherAvailabilityOverrideInput,
  type UpdateTeacherAvailabilityOverrideInput,
  type UpsertTeacherAvailabilityInput,
  createTeacherAvailabilityOverrideSchema,
  deleteTeacherAvailabilityOverrideSchema,
  updateTeacherAvailabilityOverrideSchema,
  upsertTeacherAvailabilitySchema,
} from "@/features/availability/lib/schemas";
import type {
  AvailabilityWeekData,
  TeacherAvailabilityPageData,
} from "@/features/availability/lib/types";
import {
  getAdminAvailabilityWeekData,
  getTeacherAvailabilityPageData,
} from "@/features/availability/lib/page-data";
import { normalizeTemplateEntries } from "@/features/availability/lib/utils";

const ADMIN_AVAILABILITY_PATH = "/admin/availability";
const TEACHER_AVAILABILITY_PATH = "/teacher/availability";

type AvailabilityMutationResult = AvailabilityWeekData | TeacherAvailabilityPageData;

function revalidateAvailabilityPaths() {
  revalidatePath(ADMIN_AVAILABILITY_PATH);
  revalidatePath(TEACHER_AVAILABILITY_PATH);
}

async function getAvailabilityMutationResult(
  actorRole: "ADMIN" | "TEACHER",
  teacherId: string,
): Promise<AvailabilityMutationResult> {
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  if (actorRole === "ADMIN") {
    return getAdminAvailabilityWeekData(currentWeekStart);
  }

  return getTeacherAvailabilityPageData(currentWeekStart, teacherId);
}

export async function getAdminAvailabilityWeekDataAction(
  weekStart: Date,
): Promise<Result<AvailabilityWeekData>> {
  try {
    await requireAdminContext();

    const normalizedWeekStart = startOfWeek(weekStart, { weekStartsOn: 1 });
    return ok(await getAdminAvailabilityWeekData(normalizedWeekStart));
  } catch (error) {
    rethrowIfNextControlFlow(error);
    return err(getActionErrorMessage(error, "Не удалось загрузить матрицу доступности"));
  }
}

export async function getTeacherAvailabilityAction(
  weekStart: Date,
): Promise<Result<TeacherAvailabilityPageData>> {
  try {
    const actor = await requireTeacherActor();
    const normalizedWeekStart = startOfWeek(weekStart, { weekStartsOn: 1 });
    return ok(await getTeacherAvailabilityPageData(normalizedWeekStart, actor.teacherId));
  } catch (error) {
    rethrowIfNextControlFlow(error);
    return err(getActionErrorMessage(error, "Не удалось загрузить вашу доступность"));
  }
}

export async function upsertTeacherAvailabilityAction(
  input: UpsertTeacherAvailabilityInput,
): Promise<Result<AvailabilityMutationResult>> {
  try {
    const validated = upsertTeacherAvailabilitySchema.parse(input);
    const { actorRole, targetTeacherId } = await resolveTeacherScope(validated.teacherId);
    const normalizedEntries = normalizeTemplateEntries(validated.entries);

    await prisma.$transaction(async (tx) => {
      await tx.teacherAvailability.deleteMany({
        where: { teacherId: targetTeacherId },
      });

      if (normalizedEntries.length > 0) {
        await tx.teacherAvailability.createMany({
          data: normalizedEntries.map((entry) => ({
            teacherId: targetTeacherId,
            dayOfWeek: entry.dayOfWeek,
            startTime: entry.startTime,
            endTime: entry.endTime,
            type: entry.type,
          })),
        });
      }
    });

    revalidateAvailabilityPaths();
    return ok(await getAvailabilityMutationResult(actorRole, targetTeacherId));
  } catch (error) {
    rethrowIfNextControlFlow(error);
    return err(getActionErrorMessage(error, "Не удалось сохранить недельный шаблон"));
  }
}

export async function createTeacherAvailabilityOverrideAction(
  input: CreateTeacherAvailabilityOverrideInput,
): Promise<Result<AvailabilityMutationResult>> {
  try {
    const validated = createTeacherAvailabilityOverrideSchema.parse(input);
    const { actorRole, targetTeacherId } = await resolveTeacherScope(validated.teacherId);

    await prisma.teacherAvailabilityOverride.create({
      data: {
        teacherId: targetTeacherId,
        startTime: validated.startTime,
        endTime: validated.endTime,
        type: validated.type,
      },
    });

    revalidateAvailabilityPaths();
    return ok(await getAvailabilityMutationResult(actorRole, targetTeacherId));
  } catch (error) {
    rethrowIfNextControlFlow(error);
    return err(getActionErrorMessage(error, "Не удалось создать исключение"));
  }
}

export async function updateTeacherAvailabilityOverrideAction(
  input: UpdateTeacherAvailabilityOverrideInput,
): Promise<Result<AvailabilityMutationResult>> {
  try {
    const validated = updateTeacherAvailabilityOverrideSchema.parse(input);
    const { actorRole, targetTeacherId } = await resolveTeacherScope(validated.teacherId);

    const existing = await prisma.teacherAvailabilityOverride.findUnique({
      where: { id: validated.overrideId },
      select: { id: true, teacherId: true },
    });

    if (!existing || existing.teacherId !== targetTeacherId) {
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

    revalidateAvailabilityPaths();
    return ok(await getAvailabilityMutationResult(actorRole, targetTeacherId));
  } catch (error) {
    rethrowIfNextControlFlow(error);
    return err(getActionErrorMessage(error, "Не удалось обновить исключение"));
  }
}

export async function deleteTeacherAvailabilityOverrideAction(
  input: DeleteTeacherAvailabilityOverrideInput,
): Promise<Result<AvailabilityMutationResult>> {
  try {
    const validated = deleteTeacherAvailabilityOverrideSchema.parse(input);
    const { actorRole, targetTeacherId } = await resolveTeacherScope(validated.teacherId);

    const existing = await prisma.teacherAvailabilityOverride.findUnique({
      where: { id: validated.overrideId },
      select: { id: true, teacherId: true },
    });

    if (!existing || existing.teacherId !== targetTeacherId) {
      return err("Исключение не найдено");
    }

    await prisma.teacherAvailabilityOverride.delete({
      where: { id: validated.overrideId },
    });

    revalidateAvailabilityPaths();
    return ok(await getAvailabilityMutationResult(actorRole, targetTeacherId));
  } catch (error) {
    rethrowIfNextControlFlow(error);
    return err(getActionErrorMessage(error, "Не удалось удалить исключение"));
  }
}
