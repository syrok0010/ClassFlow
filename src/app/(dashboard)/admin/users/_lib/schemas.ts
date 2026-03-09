import { z } from "zod/v4";

export const createUserSchema = z.object({
  surname: z.string().min(1, "Фамилия обязательна"),
  name: z.string().min(1, "Имя обязательно"),
  patronymicName: z.string().optional().default(""),
  email: z.email("Некорректный email").or(z.literal("")),
  domainRole: z.enum(["student", "teacher", "admin"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  id: z.string(),
  surname: z.string().min(1, "Фамилия обязательна"),
  name: z.string().min(1, "Имя обязательно"),
  patronymicName: z.string().optional().default(""),
  email: z.email("Некорректный email").or(z.literal("")),
  systemRole: z.enum(["ADMIN", "USER"]),
  isTeacher: z.boolean(),
  isStudent: z.boolean(),
  isParent: z.boolean(),
  childrenIds: z.array(z.string()),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const deleteUserSchema = z.object({
  id: z.string(),
  confirmName: z.string().min(1, "Введите имя для подтверждения"),
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

export const generateParentInviteSchema = z.object({
  studentId: z.string(),
});

export const linkExistingParentSchema = z.object({
  studentId: z.string(),
  parentId: z.string(),
});

