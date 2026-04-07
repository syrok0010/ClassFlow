import { z } from "zod";

export const createBuildingSchema = z.object({
  name: z.string().trim().min(3, "Минимум 3 символа").max(50, "Максимум 50 символов"),
  address: z.string().trim().max(100, "Максимум 100 символов").optional(),
});

export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;

export const updateBuildingSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(3, "Минимум 3 символа").max(50, "Максимум 50 символов"),
  address: z.string().trim().max(100, "Максимум 100 символов").optional(),
});

export type UpdateBuildingInput = z.infer<typeof updateBuildingSchema>;

export const createRoomSchema = z.object({
  buildingId: z.string().min(1, "Выберите здание"),
  name: z.string().trim().min(1, "Название обязательно").max(80, "Максимум 80 символов"),
  seatsCount: z
    .number()
    .int("Только целое число")
    .min(1, "Минимум 1 место")
    .max(1000, "Слишком большое значение"),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Название обязательно").max(80, "Максимум 80 символов"),
  seatsCount: z
    .number()
    .int("Только целое число")
    .min(1, "Минимум 1 место")
    .max(1000, "Слишком большое значение"),
});

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

export const deleteRoomSchema = z.object({
  id: z.string().min(1),
});

export const updateRoomSubjectsSchema = z.object({
  roomId: z.string().min(1),
  subjectIds: z.array(z.string().min(1)),
});
