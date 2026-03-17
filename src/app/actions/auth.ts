"use server"

import { prisma } from "@/lib/prisma"
import { hashPassword } from "better-auth/crypto"

import { activateInviteSchema, type ActivateInviteInput } from "@/lib/validations/auth"

export async function activateInviteAction(
  token: string,
  data: ActivateInviteInput
) {
  const validation = activateInviteSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: "Некорректные данные формы" };
  }

  const validatedData = validation.data;
  const verification = await prisma.verification.findFirst({
    where: { value: token, expiresAt: { gt: new Date() } }
  });

  if (!verification) {
    return { success: false, error: "Неверный или просроченный код приглашения" };
  }

  const userId = verification.identifier;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "PENDING_INVITE") {
    return { success: false, error: "Пользователь не найден или уже активен" };
  }

  try {
     const hashedPassword = await hashPassword(validatedData.password);
     
     await prisma.user.update({
       where: { id: userId },
       data: {
         name: validatedData.name,
         surname: validatedData.surname,
         patronymicName: validatedData.patronymicName,
         email: validatedData.email,
         status: "ACTIVE"
       }
     });
     
     await prisma.account.create({
       data: {
         userId: userId,
         accountId: userId,
         providerId: "credential",
         password: hashedPassword
       }
     });
     
     await prisma.verification.delete({ where: { id: verification.id } });
     
     return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Ошибка при активации аккаунта" };
  }
}
