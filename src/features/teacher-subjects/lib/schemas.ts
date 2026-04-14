import { z } from "zod/v4";

export const idSchema = z.string().trim().min(1, "ID обязателен");

export const gradeSchema = z
  .number({ message: "Введите число" })
  .int("Только целые числа")
  .min(0, "Минимальный класс: 0")
  .max(11, "Максимальный класс: 11");

export const gradeRangeSchema = z
  .object({
    minGrade: gradeSchema,
    maxGrade: gradeSchema,
  })
  .superRefine((value, ctx) => {
    if (value.minGrade > value.maxGrade) {
      ctx.addIssue({
        code: "custom",
        path: ["minGrade"],
        message: 'Класс "от" не может быть больше "до"',
      });
    }
  });

export const subjectGradeRangeSchema = gradeRangeSchema.extend({
  subjectId: idSchema,
});

export const createTeacherSubjectSchema = subjectGradeRangeSchema.extend({
  teacherId: idSchema.optional(),
});

const subjectTypeSchema = z.enum([
  "ACADEMIC",
  "ELECTIVE_REQUIRED",
  "ELECTIVE_OPTIONAL",
  "REGIME",
]);

export const teacherSubjectsQuerySchema = z.object({
  teacherId: idSchema.optional(),
  filters: z
    .object({
      search: z.string().optional(),
      type: subjectTypeSchema.optional(),
    })
    .optional(),
});

export const teacherSubjectKeySchema = z.object({
  teacherId: idSchema.optional(),
  subjectId: idSchema,
});

export type CreateTeacherSubjectInput = z.infer<typeof createTeacherSubjectSchema>;
export type CreateTeacherSubjectFormInput = z.infer<typeof subjectGradeRangeSchema>;
export type UpdateTeacherSubjectInput = z.infer<typeof gradeRangeSchema>;
export type TeacherSubjectKeyInput = z.infer<typeof teacherSubjectKeySchema>;
export type TeacherSubjectsQueryInput = z.infer<typeof teacherSubjectsQuerySchema>;
