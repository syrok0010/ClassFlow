import { z } from "zod";

const inviteEmailSchema = z
  .email("Некорректный email")
  .refine((email) => !email.toLowerCase().endsWith("@classflow.local"), {
    message: "Нельзя использовать служебный домен @classflow.local",
  });

const parentInviteFieldsSchema = z.object({
  email: inviteEmailSchema.or(z.literal("")),
  sendInviteEmail: z.boolean(),
});

export const createUserSchema = z
  .object({
    surname: z.string().trim().min(1, "Фамилия обязательна"),
    name: z.string().trim().min(1, "Имя обязательно"),
    patronymicName: z.string().trim(),
    email: inviteEmailSchema.or(z.literal("")),
    domainRole: z.enum(["student", "teacher", "admin"]),
    sendInviteEmail: z.boolean(),
  })
  .refine((data) => !data.sendInviteEmail || data.email.trim().length > 0, {
    path: ["email"],
    message: "Укажите email для отправки инвайта",
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

export const parentInviteFormSchema = parentInviteFieldsSchema.refine(
  (data) => !data.sendInviteEmail || data.email.trim().length > 0,
  {
    path: ["email"],
    message: "Укажите email для отправки инвайта",
  }
);

export const generateParentInviteSchema = parentInviteFieldsSchema
  .extend({
    studentId: z.string(),
  })
  .refine((data) => !data.sendInviteEmail || data.email.trim().length > 0, {
    path: ["email"],
    message: "Укажите email для отправки инвайта",
  });

export const linkExistingParentSchema = z.object({
  studentId: z.string(),
  parentId: z.string(),
});

export const sendUserInviteEmailSchema = z.object({
  userId: z.string().min(1, "Некорректный ID пользователя"),
});
