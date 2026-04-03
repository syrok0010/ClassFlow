import { z } from "zod/v4";

export const idSchema = z.string().trim().min(1, "ID обязателен");

export const gradeSchema = z
  .number({ message: "Введите число" })
  .int("Только целые числа")
  .min(0, "Минимальный класс: 0")
  .max(11, "Максимальный класс: 11");

export const createTeacherSubjectSchema = z
  .object({
    teacherId: idSchema,
    subjectId: idSchema,
    minGrade: gradeSchema,
    maxGrade: gradeSchema,
  })
  .superRefine((value, ctx) => {
    if (value.minGrade > value.maxGrade) {
      ctx.addIssue({
        code: "custom",
        path: ["minGrade"],
        message: "Класс " + "от" + " не может быть больше " + "до",
      });
    }
  });

export const updateTeacherSubjectSchema = z
  .object({
    minGrade: gradeSchema,
    maxGrade: gradeSchema,
  })
  .superRefine((value, ctx) => {
    if (value.minGrade > value.maxGrade) {
      ctx.addIssue({
        code: "custom",
        path: ["minGrade"],
        message: "Класс " + "от" + " не может быть больше " + "до",
      });
    }
  });

export const teacherSubjectKeySchema = z.object({
  teacherId: idSchema,
  subjectId: idSchema,
});

export type CreateTeacherSubjectInput = z.infer<typeof createTeacherSubjectSchema>;
export type UpdateTeacherSubjectInput = z.infer<typeof updateTeacherSubjectSchema>;
export type TeacherSubjectKeyInput = z.infer<typeof teacherSubjectKeySchema>;
