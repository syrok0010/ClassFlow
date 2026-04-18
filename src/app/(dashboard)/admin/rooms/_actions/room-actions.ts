"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import { z } from "zod";
import { requireAdminContext, rethrowIfNextControlFlow } from "@/lib/server-action-auth";
import {
  createBuildingSchema,
  createRoomSchema,
  deleteRoomSchema,
  updateBuildingSchema,
  updateRoomSubjectsSchema,
  type CreateBuildingInput,
  type CreateRoomInput,
  type UpdateBuildingInput,
  type UpdateRoomInput,
} from "../_lib/schemas";
import { roomsPageInclude, type BuildingWithRooms, type SubjectLite } from "../_lib/types";

const ROOMS_PATH = "/admin/rooms";

function normalizeBuildingAddress(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  rethrowIfNextControlFlow(error);

  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function getRoomsPageDataAction(): Promise<
  Result<{
    buildings: BuildingWithRooms[];
    subjects: SubjectLite[];
  }>
> {
  await requireAdminContext();

  try {
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

    return ok({ buildings, subjects });
  } catch (error) {
    return err(getErrorMessage(error, "Не удалось загрузить данные кабинетов"));
  }
}

export async function getRoomByIdAction(roomId: string) {
  await requireAdminContext();

  try {
    const parsed = deleteRoomSchema.parse({ id: roomId });

    const room = await prisma.room.findUnique({
      where: { id: parsed.id },
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

    if (!room) {
      return err("Кабинет не найден");
    }

    return ok(room);
  } catch (error) {
    return err(getErrorMessage(error, "Не удалось загрузить кабинет"));
  }
}

export async function createBuildingAction(input: CreateBuildingInput) {
  await requireAdminContext();

  try {
    const data = createBuildingSchema.parse(input);

    const building = await prisma.building.create({
      data: {
        name: data.name,
        address: normalizeBuildingAddress(data.address),
      },
    });

    revalidatePath(ROOMS_PATH);
    return ok(building);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при создании здания"));
  }
}

export async function updateBuildingAction(input: UpdateBuildingInput) {
  await requireAdminContext();

  try {
    const data = updateBuildingSchema.parse(input);

    const building = await prisma.building.update({
      where: { id: data.id },
      data: {
        name: data.name,
        address: normalizeBuildingAddress(data.address),
      },
    });

    revalidatePath(ROOMS_PATH);
    return ok(building);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при обновлении здания"));
  }
}

export async function deleteBuildingAction(id: string) {
  await requireAdminContext();

  try {
    const parsed = deleteRoomSchema.parse({ id });

    const roomCount = await prisma.room.count({ where: { buildingId: parsed.id } });
    if (roomCount > 0) {
      return err("Нельзя удалить здание, пока в нем есть кабинеты");
    }

    await prisma.building.delete({ where: { id: parsed.id } });
    revalidatePath(ROOMS_PATH);
    return ok(true);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при удалении здания"));
  }
}

export async function createRoomAction(input: CreateRoomInput) {
  await requireAdminContext();

  try {
    const data = createRoomSchema.parse(input);

    const room = await prisma.room.create({
      data: {
        buildingId: data.buildingId,
        name: data.name,
        seatsCount: data.seatsCount,
      },
    });

    revalidatePath(ROOMS_PATH);
    return ok(room);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при создании кабинета"));
  }
}

export async function updateRoomAction(input: UpdateRoomInput) {
  await requireAdminContext();

  try {
    const id = deleteRoomSchema.parse({ id: input.id }).id;
    const data = createRoomSchema
      .omit({ buildingId: true })
      .parse({ name: input.name, seatsCount: input.seatsCount });

    const room = await prisma.room.update({
      where: { id },
      data: {
        name: data.name,
        seatsCount: data.seatsCount,
      },
    });

    revalidatePath(ROOMS_PATH);
    return ok(room);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при обновлении кабинета"));
  }
}

export async function deleteRoomAction(id: string) {
  await requireAdminContext();

  try {
    const parsed = deleteRoomSchema.parse({ id });

    const usageCount = await prisma.scheduleEntry.count({
      where: { roomId: parsed.id },
    });

    if (usageCount > 0) {
      return err("Невозможно удалить кабинет: он используется в текущем расписании");
    }

    await prisma.room.delete({ where: { id: parsed.id } });
    revalidatePath(ROOMS_PATH);
    return ok(true);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при удалении кабинета"));
  }
}

export async function updateRoomSubjectsAction(roomId: string, subjectIds: string[]) {
  await requireAdminContext();

  try {
    const payload = updateRoomSubjectsSchema.parse({ roomId, subjectIds });

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
    return ok(true);
  } catch (error) {
    return err(getErrorMessage(error, "Некорректные данные предметов"));
  }
}
