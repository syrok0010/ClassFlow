import { z } from "zod/v4";

export const subjectTypeSchema = z.enum(["ACADEMIC", "ELECTIVE", "REGIME"]);

export const subjectNameSchema = z
  .string()
  .trim()
  .min(1, "Название обязательно")
  .max(512, "Максимум 512 символов");

export const idSchema = z.string().min(1, "ID обязателен");

export const createSubjectSchema = z.object({
  name: subjectNameSchema,
  type: subjectTypeSchema,
});

export const updateSubjectSchema = z
  .object({
    name: subjectNameSchema,
  })
  .strict();

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type IdInput = z.infer<typeof idSchema>;
