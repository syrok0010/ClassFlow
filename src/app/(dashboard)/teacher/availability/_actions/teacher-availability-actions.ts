"use server";

import { startOfWeek } from "date-fns";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import { getActionErrorMessage } from "@/lib/action-error";
import { requireTeacherActor } from "@/lib/server-action-auth";
import {
  createTeacherAvailabilityOverrideActionSchema,
  deleteTeacherAvailabilityOverrideActionSchema,
  updateTeacherAvailabilityOverrideActionSchema,
  upsertTeacherAvailabilityActionSchema,
  type CreateTeacherAvailabilityOverrideActionInput,
  type DeleteTeacherAvailabilityOverrideActionInput,
  type UpdateTeacherAvailabilityOverrideActionInput,
  type UpsertTeacherAvailabilityActionInput,
} from "../_lib/schemas";
import type { TeacherAvailabilityPageData } from "../_lib/types";
import { getTeacherAvailabilityPageData } from "../_lib/get-teacher-availability-page-data";
import { normalizeTemplateEntries } from "@/features/availability/lib/utils";

const TEACHER_AVAILABILITY_PATH = "/teacher/availability";

export async function getTeacherAvailabilityAction(
  weekStart: Date,
): Promise<Result<TeacherAvailabilityPageData>> {
  try {
    const normalizedWeekStart = startOfWeek(weekStart, { weekStartsOn: 1 });
    return ok(await getTeacherAvailabilityPageData(normalizedWeekStart));
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось загрузить вашу доступность"));
  }
}

export async function upsertTeacherAvailabilityAction(
  input: UpsertTeacherAvailabilityActionInput,
): Promise<Result<TeacherAvailabilityPageData>> {
  try {
    const actor = await requireTeacherActor();
    const validated = upsertTeacherAvailabilityActionSchema.parse(input);
    const normalizedEntries = normalizeTemplateEntries(validated.entries);

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
    return ok(await getTeacherAvailabilityPageData(startOfWeek(new Date(), { weekStartsOn: 1 })));
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось сохранить недельный шаблон"));
  }
}

export async function createTeacherAvailabilityOverrideAction(
  input: CreateTeacherAvailabilityOverrideActionInput,
): Promise<Result<TeacherAvailabilityPageData>> {
  try {
    const actor = await requireTeacherActor();
    const validated = createTeacherAvailabilityOverrideActionSchema.parse(input);

    await prisma.teacherAvailabilityOverride.create({
      data: {
        teacherId: actor.teacherId,
        startTime: validated.startTime,
        endTime: validated.endTime,
        type: validated.type,
      },
    });

    revalidatePath(TEACHER_AVAILABILITY_PATH);
    return ok(await getTeacherAvailabilityPageData(startOfWeek(new Date(), { weekStartsOn: 1 })));
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось создать исключение"));
  }
}

export async function updateTeacherAvailabilityOverrideAction(
  input: UpdateTeacherAvailabilityOverrideActionInput,
): Promise<Result<TeacherAvailabilityPageData>> {
  try {
    const actor = await requireTeacherActor();
    const validated = updateTeacherAvailabilityOverrideActionSchema.parse(input);

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
    return ok(await getTeacherAvailabilityPageData(startOfWeek(new Date(), { weekStartsOn: 1 })));
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось обновить исключение"));
  }
}

export async function deleteTeacherAvailabilityOverrideAction(
  input: DeleteTeacherAvailabilityOverrideActionInput,
): Promise<Result<TeacherAvailabilityPageData>> {
  try {
    const actor = await requireTeacherActor();
    const validated = deleteTeacherAvailabilityOverrideActionSchema.parse(input);

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
    return ok(await getTeacherAvailabilityPageData(startOfWeek(new Date(), { weekStartsOn: 1 })));
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось удалить исключение"));
  }
}
