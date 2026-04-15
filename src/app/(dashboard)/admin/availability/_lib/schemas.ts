import { z } from "zod/v4";

const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Укажите время в формате ЧЧ:ММ");

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату в формате ГГГГ-ММ-ДД");

export const availabilityTypeSchema = z.enum(["PREFERRED", "AVAILABLE", "UNAVAILABLE"]);

export const teacherAvailabilityEntrySchema = z
  .object({
    dayOfWeek: z.number().int().min(1).max(5),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
    type: availabilityTypeSchema,
  })
  .refine((value) => value.startTime < value.endTime, {
    message: "Время окончания должно быть позже времени начала",
    path: ["endTime"],
  });

export const upsertTeacherAvailabilitySchema = z.object({
  teacherId: z.string().min(1, "Не выбран преподаватель"),
  entries: z.array(teacherAvailabilityEntrySchema),
});

export const teacherAvailabilityOverrideFormSchema = z
  .object({
    teacherId: z.string().min(1, "Не выбран преподаватель"),
    startDate: isoDateSchema,
    startTime: timeStringSchema,
    endDate: isoDateSchema,
    endTime: timeStringSchema,
    type: availabilityTypeSchema,
  })
  .refine(
    (value) =>
      `${value.startDate}T${value.startTime}:00` < `${value.endDate}T${value.endTime}:00`,
    {
      message: "Окончание исключения должно быть позже начала",
      path: ["endTime"],
    },
  );

export const createTeacherAvailabilityOverrideSchema = teacherAvailabilityOverrideFormSchema;

export const updateTeacherAvailabilityOverrideSchema = teacherAvailabilityOverrideFormSchema.extend({
  overrideId: z.string().min(1, "Не найдено исключение"),
});

export const deleteTeacherAvailabilityOverrideSchema = z.object({
  teacherId: z.string().min(1, "Не выбран преподаватель"),
  overrideId: z.string().min(1, "Не найдено исключение"),
});

export const availabilityWeekQuerySchema = z.object({
  weekStart: isoDateSchema,
});

export type TeacherAvailabilityEntryInput = z.infer<typeof teacherAvailabilityEntrySchema>;
export type UpsertTeacherAvailabilityInput = z.infer<typeof upsertTeacherAvailabilitySchema>;
export type TeacherAvailabilityOverrideFormInput = z.infer<
  typeof teacherAvailabilityOverrideFormSchema
>;
export type CreateTeacherAvailabilityOverrideInput = z.infer<
  typeof createTeacherAvailabilityOverrideSchema
>;
export type UpdateTeacherAvailabilityOverrideInput = z.infer<
  typeof updateTeacherAvailabilityOverrideSchema
>;
export type DeleteTeacherAvailabilityOverrideInput = z.infer<
  typeof deleteTeacherAvailabilityOverrideSchema
>;
