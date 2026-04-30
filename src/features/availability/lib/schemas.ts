import { addMinutes, format, isValid, parse, parseISO } from "date-fns";
import { z } from "zod/v4";

const ISO_DATE_ERROR = "Укажите дату в формате ГГГГ-ММ-ДД";
const TIME_ERROR = "Укажите время в формате ЧЧ:ММ";
const TIME_RANGE_ERROR = "Время окончания должно быть позже времени начала";
const OVERRIDE_RANGE_ERROR = "Окончание исключения должно быть позже начала";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, ISO_DATE_ERROR)
  .refine((value) => {
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    return isValid(parsed) && format(parsed, "yyyy-MM-dd") === value;
  }, ISO_DATE_ERROR);

const startMinuteSchema = z
  .number({ error: TIME_ERROR })
  .int(TIME_ERROR)
  .min(0, TIME_ERROR)
  .max(1439, TIME_ERROR);

const endMinuteSchema = z
  .number({ error: TIME_ERROR })
  .int(TIME_ERROR)
  .min(0, TIME_ERROR)
  .max(1440, TIME_ERROR);

export const availabilityTypeSchema = z.enum(["PREFERRED", "AVAILABLE", "UNAVAILABLE"]);

export const teacherAvailabilityEntrySchema = z
  .object({
    dayOfWeek: z.number().int().min(1).max(7),
    startTime: startMinuteSchema,
    endTime: endMinuteSchema,
    type: availabilityTypeSchema,
  })
  .refine((value) => value.startTime < value.endTime, {
    message: TIME_RANGE_ERROR,
    path: ["endTime"],
  });

export const upsertTeacherAvailabilitySchema = z.object({
  teacherId: z.string().min(1, "Не выбран преподаватель"),
  entries: z.array(teacherAvailabilityEntrySchema),
});

export const createTeacherAvailabilityOverrideSchema = z
  .object({
    teacherId: z.string().min(1, "Не выбран преподаватель"),
    startTime: z.date(),
    endTime: z.date(),
    type: availabilityTypeSchema,
  })
  .refine((value) => value.startTime < value.endTime, {
    message: OVERRIDE_RANGE_ERROR,
    path: ["endTime"],
  });

export const updateTeacherAvailabilityOverrideSchema = createTeacherAvailabilityOverrideSchema.extend({
  overrideId: z.string().min(1, "Не найдено исключение"),
});

export const deleteTeacherAvailabilityOverrideSchema = z.object({
  teacherId: z.string().min(1, "Не выбран преподаватель"),
  overrideId: z.string().min(1, "Не найдено исключение"),
});

export const teacherAvailabilityTemplateEditorSchema = z
  .object({
    dayOfWeek: z.number().int().min(1).max(7),
    startTime: startMinuteSchema,
    endTime: endMinuteSchema,
    type: z.enum(["PREFERRED", "AVAILABLE", "UNAVAILABLE", "ERASE"]),
  })
  .refine((value) => value.startTime < value.endTime, {
    message: TIME_RANGE_ERROR,
    path: ["endTime"],
  });

export const teacherAvailabilityOverrideEditorSchema = z
  .object({
    startDate: isoDateSchema,
    startTime: startMinuteSchema,
    endDate: isoDateSchema,
    endTime: endMinuteSchema,
    type: availabilityTypeSchema,
  })
  .refine(
    (value) => {
      const start = addMinutes(parseISO(value.startDate), value.startTime);
      const end = addMinutes(parseISO(value.endDate), value.endTime);
      return start < end;
    },
    {
      message: OVERRIDE_RANGE_ERROR,
      path: ["endDate"],
    },
  );

export function mapOverrideEditorToActionInput(
  value: TeacherAvailabilityOverrideEditorInput,
): TeacherCreateAvailabilityOverrideInput {
  return {
    startTime: addMinutes(parseISO(value.startDate), value.startTime),
    endTime: addMinutes(parseISO(value.endDate), value.endTime),
    type: value.type,
  };
}

export type TeacherAvailabilityEntryInput = z.infer<typeof teacherAvailabilityEntrySchema>;
export type UpsertTeacherAvailabilityInput = z.infer<typeof upsertTeacherAvailabilitySchema>;
export type CreateTeacherAvailabilityOverrideInput = z.infer<
  typeof createTeacherAvailabilityOverrideSchema
>;
export type UpdateTeacherAvailabilityOverrideInput = z.infer<
  typeof updateTeacherAvailabilityOverrideSchema
>;
export type DeleteTeacherAvailabilityOverrideInput = z.infer<
  typeof deleteTeacherAvailabilityOverrideSchema
>;
export type TeacherAvailabilityTemplateEditorInput = z.infer<
  typeof teacherAvailabilityTemplateEditorSchema
>;
export type TeacherAvailabilityOverrideEditorInput = z.infer<
  typeof teacherAvailabilityOverrideEditorSchema
>;
export type TeacherUpsertAvailabilityInput = Pick<UpsertTeacherAvailabilityInput, "entries">;
export type TeacherCreateAvailabilityOverrideInput = Pick<
  CreateTeacherAvailabilityOverrideInput,
  "startTime" | "endTime" | "type"
>;
export type TeacherUpdateAvailabilityOverrideInput = Pick<
  UpdateTeacherAvailabilityOverrideInput,
  "overrideId" | "startTime" | "endTime" | "type"
>;
export type TeacherDeleteAvailabilityOverrideInput = Pick<
  DeleteTeacherAvailabilityOverrideInput,
  "overrideId"
>;
