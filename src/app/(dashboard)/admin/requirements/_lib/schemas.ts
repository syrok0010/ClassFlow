import { z } from "zod";

export const lessonsPerWeekSchema = z
  .number({ error: "Укажите часы" })
  .int("Только целое число")
  .min(0, "Часы не могут быть меньше 0")
  .max(99, "Максимум 99 часов");

export const durationMinutesSchema = z
  .number({ error: "Укажите длительность" })
  .int("Только целое число")
  .min(1, "Длительность должна быть больше 0")
  .max(180, "Максимум 180 минут");

export const breakDurationSchema = z
  .number({ error: "Укажите перемену" })
  .int("Только целое число")
  .min(0, "Перемена не может быть меньше 0")
  .max(60, "Максимум 60 минут");

export const requirementCellFormSchema = z.object({
  lessonsPerWeek: lessonsPerWeekSchema,
  durationInMinutes: durationMinutesSchema,
  breakDuration: breakDurationSchema,
});

export const requirementMutationSchema = requirementCellFormSchema.extend({
  groupId: z.string().min(1, "Группа обязательна"),
  subjectId: z.string().min(1, "Предмет обязателен"),
});
