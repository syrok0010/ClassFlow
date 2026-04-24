"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/server-action-auth";

import {
  adminScheduleTemplateMutationSchema,
  type AdminScheduleTemplateMutationInput,
} from "../_lib/schedule-mutations-schema";

const SCHEDULE_PATH = "/admin/schedule";

export async function createOrUpdateAdminScheduleTemplateAction(input: AdminScheduleTemplateMutationInput) {
  await requireAdminContext();
  const parsed = adminScheduleTemplateMutationSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const payload = parsed.data;

  if (!payload.detached && (payload.dayOfWeek === null || payload.startMinutes === null || payload.endMinutes === null)) {
    return { error: "Для карточки в расписании нужны день и время" };
  }

  if (
    !payload.detached &&
    payload.startMinutes !== null &&
    payload.endMinutes !== null &&
    payload.endMinutes <= payload.startMinutes
  ) {
    return { error: "Время окончания должно быть позже времени начала" };
  }

  const data = {
    dayOfWeek: payload.detached ? 1 : (payload.dayOfWeek ?? 1),
    startTime: payload.detached ? 0 : (payload.startMinutes ?? 0),
    endTime: payload.detached ? 1 : (payload.endMinutes ?? 1),
    groupId: payload.groupId,
    subjectId: payload.subjectId,
    roomId: payload.roomId,
    teacherId: payload.teacherId,
  };

  if (payload.templateId) {
    await prisma.weeklyScheduleTemplate.update({
      where: { id: payload.templateId },
      data,
    });
  } else {
    await prisma.weeklyScheduleTemplate.create({ data });
  }

  revalidatePath(SCHEDULE_PATH);
  return { error: null };
}

export async function deleteAdminScheduleTemplateAction(templateId: string) {
  await requireAdminContext();

  if (!templateId) {
    return { error: "Не передан ID шаблона" };
  }

  await prisma.weeklyScheduleTemplate.delete({
    where: { id: templateId },
  });

  revalidatePath(SCHEDULE_PATH);
  return { error: null };
}
