import { z } from "zod/v4";

export const idSchema = z.string().trim().min(1, "ID обязателен");

export const gradeSchema = z
  .number({ message: "Введите число" })
  .int("Только целые числа")
  .min(0, "Минимальный класс: 0")
  .max(11, "Максимальный класс: 11");

export const gradeTextSchema = z
  .string()
  .trim()
  .min(1, "Укажите диапазон классов")
  .pipe(z.coerce.number({ message: "Введите число" }))
  .pipe(gradeSchema);

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

export const createTeacherSubjectFormSchema = z
  .object({
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

export const createTeacherSubjectInlineFormSchema = z
  .object({
    subjectId: idSchema,
    minGrade: gradeTextSchema,
    maxGrade: gradeTextSchema,
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

export const updateTeacherSubjectInlineFormSchema = z
  .object({
    minGrade: gradeTextSchema,
    maxGrade: gradeTextSchema,
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
export type CreateTeacherSubjectFormInput = z.infer<typeof createTeacherSubjectFormSchema>;
export type UpdateTeacherSubjectInput = z.infer<typeof updateTeacherSubjectSchema>;
export type TeacherSubjectKeyInput = z.infer<typeof teacherSubjectKeySchema>;
export type CreateTeacherSubjectInlineFormValues = z.input<typeof createTeacherSubjectInlineFormSchema>;
export type CreateTeacherSubjectInlineFormInput = z.infer<typeof createTeacherSubjectInlineFormSchema>;
export type UpdateTeacherSubjectInlineFormValues = z.input<typeof updateTeacherSubjectInlineFormSchema>;
