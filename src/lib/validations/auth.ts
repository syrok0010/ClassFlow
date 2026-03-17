import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Введите корректный email").trim(),
  password: z.string().min(1, "Введите пароль"),
});

export const activateInviteSchema = z.object({
  name: z.string().trim().min(1, "Имя обязательно"),
  surname: z.string().trim().min(1, "Фамилия обязательна"),
  patronymicName: z.string().trim(),
  email: z.email("Неверный формат email").trim(),
  password: z.string().min(8, "Пароль должен быть не менее 8 символов"),
  confirmPassword: z.string().min(1, "Подтвердите пароль"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

export type ActivateInviteInput = z.infer<typeof activateInviteSchema>;
