"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  createBuildingSchema,
  createRoomSchema,
  deleteRoomSchema,
  updateBuildingSchema,
  updateRoomSchema,
  updateRoomSubjectsSchema,
  type CreateBuildingInput,
  type CreateRoomInput,
  type UpdateBuildingInput,
  type UpdateRoomInput,
} from "../_lib/schemas";
import { roomsPageInclude } from "../_lib/types";

const ROOMS_PATH = "/admin/rooms";

function normalizeBuildingAddress(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function getRoomsPageDataAction() {
  const [buildings, subjects] = await Promise.all([
    prisma.building.findMany({
      include: roomsPageInclude,
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { buildings, subjects };
}

export async function getRoomByIdAction(roomId: string) {
  return prisma.room.findUnique({
    where: { id: roomId },
    include: {
      building: {
        select: { id: true, name: true },
      },
      roomSubjects: {
        include: {
          subject: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });
}

export async function createBuildingAction(input: CreateBuildingInput) {
  const parsed = createBuildingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const data = parsed.data;

  const building = await prisma.building.create({
    data: {
      name: data.name,
      address: normalizeBuildingAddress(data.address),
    },
  });

  revalidatePath(ROOMS_PATH);
  return { building };
}

export async function updateBuildingAction(input: UpdateBuildingInput) {
  const parsed = updateBuildingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const data = parsed.data;

  const building = await prisma.building.update({
    where: { id: data.id },
    data: {
      name: data.name,
      address: normalizeBuildingAddress(data.address),
    },
  });

  revalidatePath(ROOMS_PATH);
  return { building };
}

export async function deleteBuildingAction(id: string) {
  const roomCount = await prisma.room.count({ where: { buildingId: id } });
  if (roomCount > 0) {
    return { error: "Нельзя удалить здание, пока в нем есть кабинеты" };
  }

  await prisma.building.delete({ where: { id } });
  revalidatePath(ROOMS_PATH);
  return { success: true };
}

export async function createRoomAction(input: CreateRoomInput) {
  const parsed = createRoomSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const data = parsed.data;

  const room = await prisma.room.create({
    data: {
      buildingId: data.buildingId,
      name: data.name,
      seatsCount: data.seatsCount,
    },
  });

  revalidatePath(ROOMS_PATH);
  return { room };
}

export async function updateRoomAction(input: UpdateRoomInput) {
  const parsed = updateRoomSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const data = parsed.data;

  const room = await prisma.room.update({
    where: { id: data.id },
    data: {
      name: data.name,
      seatsCount: data.seatsCount,
    },
  });

  revalidatePath(ROOMS_PATH);
  return { room };
}

export async function deleteRoomAction(id: string) {
  const parsed = deleteRoomSchema.safeParse({ id });
  if (!parsed.success) {
    return { error: "Некорректный ID кабинета" };
  }

  const usageCount = await prisma.scheduleEntry.count({
    where: { roomId: id },
  });

  if (usageCount > 0) {
    return { error: "Невозможно удалить кабинет: он используется в текущем расписании" };
  }

  await prisma.room.delete({ where: { id } });
  revalidatePath(ROOMS_PATH);
  return { success: true };
}

export async function updateRoomSubjectsAction(roomId: string, subjectIds: string[]) {
  const parsed = updateRoomSubjectsSchema.safeParse({ roomId, subjectIds });
  if (!parsed.success) {
    return { error: "Некорректные данные предметов" };
  }

  const payload = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.roomSubject.deleteMany({ where: { roomId: payload.roomId } });

    if (payload.subjectIds.length > 0) {
      await tx.roomSubject.createMany({
        data: payload.subjectIds.map((subjectId) => ({
          roomId: payload.roomId,
          subjectId,
        })),
      });
    }
  });

  revalidatePath(ROOMS_PATH);
  return { success: true };
}
