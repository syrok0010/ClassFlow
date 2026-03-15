"use server"

import { prisma } from "@/lib/prisma"
import { hashPassword } from "better-auth/crypto"

export async function activateInviteAction(
  token: string,
  data: {
    name?: string;
    surname?: string;
    patronymicName?: string;
    email?: string;
    password: string;
  }
) {
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
     const hashedPassword = await hashPassword(data.password);
     
     await prisma.user.update({
       where: { id: userId },
       data: {
         name: data.name || user.name,
         surname: data.surname || user.surname,
         patronymicName: data.patronymicName || user.patronymicName,
         email: data.email || user.email,
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
