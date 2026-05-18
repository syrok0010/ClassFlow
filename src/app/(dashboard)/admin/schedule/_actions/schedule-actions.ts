"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/server-action-auth";

import {
  adminScheduleTemplateMutationSchema,
  createAdminScheduleTemplateMutationSchema,
  type AdminScheduleTemplateMutationInput,
} from "../_lib/schedule-mutations-schema";

const SCHEDULE_PATH = "/admin/schedule";

export async function createOrUpdateAdminScheduleTemplateAction(input: AdminScheduleTemplateMutationInput) {
  await requireAdminContext();
  const parsed = adminScheduleTemplateMutationSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const payload = {
    ...parsed.data,
    openClassIds: Array.from(new Set(parsed.data.openClassIds)),
    coveredClassIds: Array.from(new Set(parsed.data.coveredClassIds)),
  };
  const isDetached =
    payload.dayOfWeek === null
    || payload.startMinutes === null
    || payload.endMinutes === null;

  const subject = await prisma.subject.findUnique({
    where: { id: payload.subjectId },
    select: { id: true, type: true },
  });

  const deliveryGroup = payload.deliveryGroupId
    ? await prisma.group.findUnique({
        where: { id: payload.deliveryGroupId },
	        select: { id: true, type: true, subjectId: true },
	      })
    : null;

  const linkedClassIds = Array.from(new Set([...payload.openClassIds, ...payload.coveredClassIds]));
  const linkedClasses = linkedClassIds.length > 0
    ? await prisma.group.findMany({
	        where: { id: { in: linkedClassIds } },
        select: { id: true, type: true },
	      })
    : [];

  const contextualValidation = createAdminScheduleTemplateMutationSchema({
    subjectsById: subject
      ? {
          [subject.id]: {
            type: subject.type,
          },
        }
      : {},
    groupsById: deliveryGroup
      ? {
          [deliveryGroup.id]: {
            type: deliveryGroup.type,
            subjectId: deliveryGroup.subjectId,
          },
        }
      : {},
    classIds: linkedClasses.filter((group) => group.type === "CLASS").map((group) => group.id),
  }).safeParse(payload);

  if (!contextualValidation.success) {
    return { error: contextualValidation.error.issues[0]?.message ?? "Некорректные данные" };
  }

  const openClassesCreate = payload.openClassIds.map((classGroupId) => ({ classGroupId }));
  const coveredClassesCreate = payload.coveredClassIds.map((classGroupId) => ({ classGroupId }));

  const sharedData = {
    dayOfWeek: isDetached ? null : payload.dayOfWeek,
    startTime: isDetached ? null : payload.startMinutes,
    endTime: isDetached ? null : payload.endMinutes,
    subjectId: payload.subjectId,
    roomId: payload.roomId,
    teacherId: payload.teacherId,
    deliveryMode: payload.deliveryMode,
    deliveryGroupId: payload.deliveryMode === "SHARED_CLASSES" ? null : payload.deliveryGroupId,
  };

  if (payload.templateId) {
    const updateData = {
      ...sharedData,
      openClasses: {
        deleteMany: {},
        ...(openClassesCreate.length > 0 ? { create: openClassesCreate } : {}),
      },
      coveredClasses: {
        deleteMany: {},
        ...(coveredClassesCreate.length > 0 ? { create: coveredClassesCreate } : {}),
      },
    } satisfies Prisma.WeeklyScheduleTemplateUncheckedUpdateInput;

    await prisma.weeklyScheduleTemplate.update({
      where: { id: payload.templateId },
      data: updateData,
    });
  } else {
    const createData = {
      ...sharedData,
      ...(openClassesCreate.length > 0 ? { openClasses: { create: openClassesCreate } } : {}),
      ...(coveredClassesCreate.length > 0 ? { coveredClasses: { create: coveredClassesCreate } } : {}),
    } satisfies Prisma.WeeklyScheduleTemplateUncheckedCreateInput;

    await prisma.weeklyScheduleTemplate.create({ data: createData });
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
