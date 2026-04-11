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

  try {
    const userId = verification.identifier;
    const hashedPassword = await hashPassword(validatedData.password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true },
      });

      if (!user || user.status !== "PENDING_INVITE") {
        return { success: false, error: "Пользователь не найден или уже активен" } as const;
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          name: validatedData.name,
          surname: validatedData.surname,
          patronymicName: validatedData.patronymicName,
          email: validatedData.email,
          status: "ACTIVE"
        }
      });

      await tx.account.create({
        data: {
          userId,
          accountId: userId,
          providerId: "credential",
          password: hashedPassword
        }
      });

      await tx.verification.delete({ where: { id: verification.id } });

      return { success: true } as const;
    });

    return result;
  } catch (err) {
    console.error(err);
    return { success: false, error: "Ошибка при активации аккаунта" };
  }
}
