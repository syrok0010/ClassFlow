import { z } from "zod";

export const createUserSchema = z.object({
  surname: z.string().trim().min(1, "Фамилия обязательна"),
  name: z.string().trim().min(1, "Имя обязательно"),
  patronymicName: z.string().trim(),
  email: z.email("Некорректный email").or(z.literal("")),
  domainRole: z.enum(["student", "teacher", "admin"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  id: z.string(),
  surname: z.string().trim().min(1, "Фамилия обязательна"),
  name: z.string().trim().min(1, "Имя обязательно"),
  patronymicName: z.string().trim(),
  email: z.email("Некорректный email").or(z.literal("")),
  systemRole: z.enum(["ADMIN", "USER"]),
  isTeacher: z.boolean(),
  isStudent: z.boolean(),
  isParent: z.boolean(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const deleteUserSchema = z.object({
  id: z.string(),
  confirmName: z.string().trim().min(1, "Введите имя для подтверждения"),
});

export const generateParentInviteSchema = z.object({
  studentId: z.string(),
});

export const linkExistingParentSchema = z.object({
  studentId: z.string(),
  parentId: z.string(),
});
