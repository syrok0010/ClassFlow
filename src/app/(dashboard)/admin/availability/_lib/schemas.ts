import {addMinutes, parse} from "date-fns";
import { z } from "zod/v4";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату в формате ГГГГ-ММ-ДД");

export const availabilityTypeSchema = z.enum(["PREFERRED", "AVAILABLE", "UNAVAILABLE"]);

export const teacherAvailabilityEntrySchema = z
  .object({
    dayOfWeek: z.number().int().min(1).max(7),
    startTime: z.number().int().min(0).max(1439),
    endTime: z.number().int().min(0).max(1440),
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
    startTime: z.number().int().min(0).max(1439),
    endDate: isoDateSchema,
    endTime: z.number().int().min(0).max(1440),
    type: availabilityTypeSchema,
  })
  .refine(
    (value) => {
      const start = addMinutes(parse(value.startDate, "yyyy-MM-dd", new Date()), value.startTime);
      const end = addMinutes(parse(value.endDate, "yyyy-MM-dd", new Date()), value.endTime);
      return start < end;
    },
    {
      message: "Окончание исключения должно быть позже начала",
      path: ["endTime"],
    },
  );

export const createTeacherAvailabilityOverrideSchema = z.object({
  teacherId: z.string().min(1, "Не выбран преподаватель"),
  startTime: z.date(),
  endTime: z.date(),
  type: availabilityTypeSchema,
}).refine(val => val.startTime < val.endTime, {
  message: "Окончание исключения должно быть позже начала",
  path: ["endTime"]
});

export const updateTeacherAvailabilityOverrideSchema = createTeacherAvailabilityOverrideSchema.extend({
  overrideId: z.string().min(1, "Не найдено исключение"),
});

export const deleteTeacherAvailabilityOverrideSchema = z.object({
  teacherId: z.string().min(1, "Не выбран преподаватель"),
  overrideId: z.string().min(1, "Не найдено исключение"),
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
