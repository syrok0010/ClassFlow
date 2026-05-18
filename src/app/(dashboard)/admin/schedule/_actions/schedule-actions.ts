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
  const isDetached =
    payload.dayOfWeek === null
    || payload.startMinutes === null
    || payload.endMinutes === null;

  if (!isDetached && (payload.dayOfWeek === null || payload.startMinutes === null || payload.endMinutes === null)) {
    return { error: "Для карточки в расписании нужны день и время" };
  }

  if (
    !isDetached &&
    payload.startMinutes !== null &&
    payload.endMinutes !== null &&
    payload.endMinutes <= payload.startMinutes
  ) {
    return { error: "Время окончания должно быть позже времени начала" };
  }

  const subject = await prisma.subject.findUnique({
    where: { id: payload.subjectId },
    select: { id: true, type: true },
  });

  if (!subject) {
    return { error: "Предмет не найден" };
  }

  const deliveryGroup = payload.deliveryGroupId
    ? await prisma.group.findUnique({
        where: { id: payload.deliveryGroupId },
        select: { id: true, type: true, subjectId: true },
      })
    : null;

  const openClassIds = Array.from(new Set(payload.openClassIds));
  const coveredClassIds = Array.from(new Set(payload.coveredClassIds));
  const linkedClassIds = Array.from(new Set([...openClassIds, ...coveredClassIds]));
  const linkedClasses = linkedClassIds.length > 0
    ? await prisma.group.findMany({
        where: { id: { in: linkedClassIds } },
        select: { id: true, type: true },
      })
    : [];

  if (linkedClassIds.length !== linkedClasses.length || linkedClasses.some((group) => group.type !== "CLASS")) {
    return { error: "Связанные строки должны быть целыми классами" };
  }

  if (payload.deliveryMode === "DIRECT_GROUP") {
    if (!deliveryGroup || (deliveryGroup.type !== "CLASS" && deliveryGroup.type !== "SUBJECT_SUBGROUP")) {
      return { error: "Для карточки этого типа нужна группа класса или подгруппы" };
    }

    if (openClassIds.length > 0 || coveredClassIds.length > 0) {
      return { error: "Для прямой карточки нельзя задавать открытые или покрываемые классы" };
    }

    if (subject.type === "ELECTIVE_OPTIONAL") {
      return { error: "Доп по выбору должен создаваться через группу по выбору" };
    }
  }

  if (payload.deliveryMode === "ELECTIVE_GROUP") {
    if (!deliveryGroup || deliveryGroup.type !== "ELECTIVE_GROUP") {
      return { error: "Для допа по выбору нужна группа по выбору" };
    }

    if (openClassIds.length === 0) {
      return { error: "Укажите хотя бы один класс, для которого открыт доп по выбору" };
    }

    if (coveredClassIds.length > 0) {
      return { error: "Для допа по выбору нельзя задавать покрываемые классы" };
    }

    if (subject.type !== "ELECTIVE_OPTIONAL") {
      return { error: "Группа по выбору может использоваться только с предметом типа 'доп по выбору'" };
    }

    if (deliveryGroup.subjectId && deliveryGroup.subjectId !== subject.id) {
      return { error: "Предмет карточки должен совпадать с предметом группы по выбору" };
    }
  }

  if (payload.deliveryMode === "SHARED_CLASSES") {
    if (deliveryGroup) {
      return { error: "Для общего занятия нельзя задавать группу доставки" };
    }

    if (openClassIds.length > 0) {
      return { error: "Для общего занятия нельзя задавать открытые классы" };
    }

    if (coveredClassIds.length < 2) {
      return { error: "Общее занятие должно покрывать минимум два класса" };
    }

    if (subject.type !== "ELECTIVE_REQUIRED" && subject.type !== "REGIME") {
      return { error: "Общими могут быть только обязательные допы и режимные предметы" };
    }
  }

  const data: {
    dayOfWeek: number | null;
    startTime: number | null;
    endTime: number | null;
    subjectId: string;
    roomId: string | null;
    teacherId: string | null;
    deliveryMode: AdminScheduleTemplateMutationInput["deliveryMode"];
    deliveryGroupId: string | null;
    openClasses: {
      deleteMany: Record<string, never>;
      create?: Array<{ classGroupId: string }>;
    };
    coveredClasses: {
      deleteMany: Record<string, never>;
      create?: Array<{ classGroupId: string }>;
    };
  } = {
    dayOfWeek: isDetached ? null : payload.dayOfWeek,
    startTime: isDetached ? null : payload.startMinutes,
    endTime: isDetached ? null : payload.endMinutes,
    subjectId: payload.subjectId,
    roomId: payload.roomId,
    teacherId: payload.teacherId,
    deliveryMode: payload.deliveryMode,
    deliveryGroupId: payload.deliveryMode === "SHARED_CLASSES" ? null : payload.deliveryGroupId,
    openClasses: {
      deleteMany: {},
    },
    coveredClasses: {
      deleteMany: {},
    },
  };

  if (openClassIds.length > 0) {
    data.openClasses.create = openClassIds.map((classGroupId) => ({ classGroupId }));
  }

  if (coveredClassIds.length > 0) {
    data.coveredClasses.create = coveredClassIds.map((classGroupId) => ({ classGroupId }));
  }

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
