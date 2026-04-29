import { addMinutes, isBefore, isEqual, parse, parseISO } from "date-fns";
import { z } from "zod/v4";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Укажите дату в формате ГГГГ-ММ-ДД");

const timeStringSchema = z
  .string()
  .min(1, "Заполните время")
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Укажите время в формате ЧЧ:ММ");

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
z
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

export const createTeacherAvailabilityOverrideSchema = z
  .object({
    teacherId: z.string().min(1, "Не выбран преподаватель"),
    startTime: z.date(),
    endTime: z.date(),
    type: availabilityTypeSchema,
  })
  .refine((value) => value.startTime < value.endTime, {
    message: "Окончание исключения должно быть позже начала",
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
    startTime: timeStringSchema,
    endTime: timeStringSchema,
    type: z.enum(["PREFERRED", "AVAILABLE", "UNAVAILABLE", "ERASE"]),
  })
  .refine((value) => timeStringToMinutes(value.startTime) < timeStringToMinutes(value.endTime), {
    message: "Время окончания должно быть позже времени начала",
    path: ["endTime"],
  });

export const teacherAvailabilityOverrideEditorSchema = z
  .object({
    startDate: isoDateSchema,
    startTime: timeStringSchema,
    endDate: isoDateSchema,
    endTime: timeStringSchema,
    type: availabilityTypeSchema,
  })
  .superRefine((value, ctx) => {
    const startDate = parse(value.startDate, "yyyy-MM-dd", new Date());
    const endDate = parse(value.endDate, "yyyy-MM-dd", new Date());

    if (isBefore(endDate, startDate)) {
      ctx.addIssue({
        code: "custom",
        message: "Дата окончания должна быть не раньше даты начала",
        path: ["endDate"],
      });
      return;
    }

    const start = addMinutes(startDate, timeStringToMinutes(value.startTime));
    const end = addMinutes(endDate, timeStringToMinutes(value.endTime));

    if ((isEqual(startDate, endDate) || isEqual(endDate, startDate)) && end <= start) {
      ctx.addIssue({
        code: "custom",
        message: "Время окончания должно быть позже времени начала",
        path: ["endTime"],
      });
    }
  });

export function timeStringToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTimeString(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function mapOverrideEditorToActionInput(
  value: TeacherAvailabilityOverrideEditorInput,
): Pick<CreateTeacherAvailabilityOverrideInput, "startTime" | "endTime" | "type"> {
  return {
    startTime: addMinutes(parseISO(value.startDate), timeStringToMinutes(value.startTime)),
    endTime: addMinutes(parseISO(value.endDate), timeStringToMinutes(value.endTime)),
    type: value.type,
  };
}

export function mapTemplateEditorToEntryInput(
  value: TeacherAvailabilityTemplateEditorInput,
): TeacherAvailabilityEntryInput {
  if (value.type === "ERASE") {
    throw new Error("ERASE cannot be converted into a template entry payload");
  }

  return {
    dayOfWeek: value.dayOfWeek,
    startTime: timeStringToMinutes(value.startTime),
    endTime: timeStringToMinutes(value.endTime),
    type: value.type,
  };
}

export type TeacherAvailabilityEntryInput = z.infer<typeof teacherAvailabilityEntrySchema>;
export type CreateTeacherAvailabilityOverrideInput = z.infer<
  typeof createTeacherAvailabilityOverrideSchema
>;
export type UpdateTeacherAvailabilityOverrideInput = z.infer<
  typeof updateTeacherAvailabilityOverrideSchema
>;
export type TeacherAvailabilityTemplateEditorInput = z.infer<
  typeof teacherAvailabilityTemplateEditorSchema
>;
export type TeacherAvailabilityOverrideEditorInput = z.infer<
  typeof teacherAvailabilityOverrideEditorSchema
>;
