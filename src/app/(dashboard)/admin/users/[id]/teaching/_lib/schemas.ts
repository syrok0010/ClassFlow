import { z } from "zod/v4";

export const idSchema = z.string().trim().min(1, "ID обязателен");

export const gradeSchema = z
  .number({ message: "Введите число" })
  .int("Только целые числа")
  .min(0, "Минимальный класс: 0")
  .max(11, "Максимальный класс: 11");

export const gradeInputSchema = z
  .string()
  .trim()
  .min(1, "Укажите диапазон классов")
  .pipe(z.coerce.number({ message: "Введите число" }))
  .pipe(gradeSchema);

function addGradeRangeValidation<T extends z.ZodObject<z.ZodRawShape>>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const payload = value as { minGrade: number; maxGrade: number };
    if (payload.minGrade > payload.maxGrade) {
      ctx.addIssue({
        code: "custom",
        path: ["minGrade"],
        message: "Класс \"от\" не может быть больше \"до\"",
      });
    }
  });
}

const teacherSubjectBaseObjectSchema = z.object({
  subjectId: idSchema,
  minGrade: gradeSchema,
  maxGrade: gradeSchema,
});

const teacherSubjectFormBaseObjectSchema = z.object({
  subjectId: idSchema,
  minGrade: gradeInputSchema,
  maxGrade: gradeInputSchema,
});

export const createTeacherSubjectSchema = addGradeRangeValidation(
  teacherSubjectBaseObjectSchema.extend({
    teacherId: idSchema,
  })
);

export const createTeacherSubjectFormSchema = addGradeRangeValidation(teacherSubjectFormBaseObjectSchema);

export const updateTeacherSubjectSchema = addGradeRangeValidation(
  teacherSubjectBaseObjectSchema.pick({
    minGrade: true,
    maxGrade: true,
  })
);

export const createTeacherSubjectInlineFormSchema = createTeacherSubjectFormSchema;

export const createTeacherSubjectInlineValidationSchema = createTeacherSubjectInlineFormSchema;

export const updateTeacherSubjectInlineFormSchema = addGradeRangeValidation(
  z.object({
    minGrade: gradeInputSchema,
    maxGrade: gradeInputSchema,
  })
);

export const updateTeacherSubjectInlineValidationSchema = updateTeacherSubjectInlineFormSchema;

export const teacherSubjectKeySchema = z.object({
  teacherId: idSchema,
  subjectId: idSchema,
});

export type CreateTeacherSubjectInput = z.infer<typeof createTeacherSubjectSchema>;
export type CreateTeacherSubjectFormInput = z.infer<typeof createTeacherSubjectFormSchema>;
export type UpdateTeacherSubjectInput = z.infer<typeof updateTeacherSubjectSchema>;
export type TeacherSubjectKeyInput = z.infer<typeof teacherSubjectKeySchema>;
export type CreateTeacherSubjectInlineFormValues = z.input<typeof createTeacherSubjectInlineFormSchema>;
export type CreateTeacherSubjectInlineFormInput = z.infer<typeof createTeacherSubjectInlineFormSchema>;
export type UpdateTeacherSubjectInlineFormValues = z.input<typeof updateTeacherSubjectInlineFormSchema>;
