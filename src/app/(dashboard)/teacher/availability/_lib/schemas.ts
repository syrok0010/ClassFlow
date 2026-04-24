import { addMinutes, parse, parseISO } from "date-fns";
import { z } from "zod/v4";
import {
  availabilityTypeSchema,
  teacherAvailabilityEntrySchema,
} from "@/features/availability/lib/schemas";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату в формате ГГГГ-ММ-ДД");

export const teacherAvailabilityTemplateEditorSchema = z
  .object({
    dayOfWeek: z.number().int().min(1).max(7),
    startTime: z.number().int().min(0).max(1439),
    endTime: z.number().int().min(0).max(1440),
    type: z.enum(["PREFERRED", "AVAILABLE", "UNAVAILABLE", "ERASE"]),
  })
  .refine((value) => value.startTime < value.endTime, {
    message: "Время окончания должно быть позже времени начала",
    path: ["endTime"],
  });

export const teacherAvailabilityOverrideEditorSchema = z
  .object({
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

export const upsertTeacherAvailabilityActionSchema = z.object({
  entries: z.array(teacherAvailabilityEntrySchema),
});

export const createTeacherAvailabilityOverrideActionSchema = z
  .object({
    startTime: z.date(),
    endTime: z.date(),
    type: availabilityTypeSchema,
  })
  .refine((value) => value.startTime < value.endTime, {
    message: "Окончание исключения должно быть позже начала",
    path: ["endTime"],
  });

export const updateTeacherAvailabilityOverrideActionSchema =
  createTeacherAvailabilityOverrideActionSchema.extend({
    overrideId: z.string().min(1, "Не найдено исключение"),
  });

export const deleteTeacherAvailabilityOverrideActionSchema = z.object({
  overrideId: z.string().min(1, "Не найдено исключение"),
});

export function mapOverrideEditorToActionInput(
  value: TeacherAvailabilityOverrideEditorInput,
) {
  return {
    startTime: addMinutes(parseISO(value.startDate), value.startTime),
    endTime: addMinutes(parseISO(value.endDate), value.endTime),
    type: value.type,
  };
}

export type TeacherAvailabilityTemplateEditorInput = z.infer<
  typeof teacherAvailabilityTemplateEditorSchema
>;
export type TeacherAvailabilityOverrideEditorInput = z.infer<
  typeof teacherAvailabilityOverrideEditorSchema
>;
export type UpsertTeacherAvailabilityActionInput = z.infer<
  typeof upsertTeacherAvailabilityActionSchema
>;
export type CreateTeacherAvailabilityOverrideActionInput = z.infer<
  typeof createTeacherAvailabilityOverrideActionSchema
>;
export type UpdateTeacherAvailabilityOverrideActionInput = z.infer<
  typeof updateTeacherAvailabilityOverrideActionSchema
>;
export type DeleteTeacherAvailabilityOverrideActionInput = z.infer<
  typeof deleteTeacherAvailabilityOverrideActionSchema
>;
