"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { err, ok, type Result } from "@/lib/result";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { createParentInviteForStudent, createStaffInviteToken } from "@/features/users/invites";
import { requireAdminContext, rethrowIfNextControlFlow } from "@/lib/server-action-auth";
import { buildServerInviteUrl } from "@/lib/server-invite";
import { InviteEmailConfigError, sendInviteEmail } from "@/lib/email/invite-email";
import {
  type CreateUserInput,
  createUserSchema,
  deleteUserSchema,
  generateParentInviteSchema,
  linkExistingParentSchema,
  sendUserInviteEmailSchema,
  updateUserSchema,
  UpdateUserInput,
} from "../_lib/schemas";
import { userInclude, type UsersFilterState } from "../_lib/types";

async function getOrCreateActiveStaffInviteToken(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: string
) {
  const verification = await tx.verification.findFirst({
    where: {
      identifier: userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "desc" },
  });

  if (verification) {
    return verification.value;
  }

  return createStaffInviteToken(tx, userId);
}

function getUserFullName(user: { surname?: string | null; name?: string | null; patronymicName?: string | null }) {
  return [user.surname, user.name, user.patronymicName].filter(Boolean).join(" ");
}

function hasRealInviteEmail(email: string | null): email is string {
  return Boolean(email && !/^(pending|parent-pending)-[a-f0-9]+@classflow\.local$/i.test(email));
}

function getInviteEmailErrorMessage(error: unknown) {
  if (error instanceof InviteEmailConfigError) {
    return error.message;
  }

  console.error("Ошибка при отправке инвайта на email:", error);
  return "Не удалось отправить email";
}

const USERS_PATH = "/admin/users";

export async function getUsersAction(filters?: Partial<UsersFilterState>) {
  await requireAdminContext();

  const where: Prisma.UserWhereInput = {};

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { surname: { contains: filters.search, mode: "insensitive" } },
      { patronymicName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters?.domainRole) {
    switch (filters.domainRole) {
      case "teacher":
        where.teachers = { some: {} };
        break;
      case "student":
        where.students = { some: {} };
        break;
      case "parent":
        where.parents = { some: {} };
        break;
    }
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  return prisma.user.findMany({
    where,
    include: userInclude,
    orderBy: [{ surname: "asc" }, { name: "asc" }],
  });
}

export async function createUserAction(input: CreateUserInput) {
  await requireAdminContext();

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const data = parsed.data;

  try {
    const { user, token } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          surname: data.surname,
          name: data.name,
          patronymicName: data.patronymicName || null,
          email: data.email || `pending-${randomBytes(4).toString("hex")}@classflow.local`,
          role: data.domainRole === "admin" ? "ADMIN" : "USER",
          status: "PENDING_INVITE",
          ...(data.domainRole === "student" ? { students: { create: {} } } : {}),
          ...(data.domainRole === "teacher" ? { teachers: { create: {} } } : {}),
        },
        include: userInclude,
      });

      const newToken = await createStaffInviteToken(tx, newUser.id);

      return { user: newUser, token: newToken };
    });

    let emailDelivery:
      | { status: "not_requested" }
      | { status: "sent"; recipient: string }
      | { status: "failed"; recipient: string; error: string } = { status: "not_requested" };

    if (data.email && data.sendInviteEmail) {
      try {
        await sendInviteEmail({
          to: data.email,
          inviteUrl: buildServerInviteUrl(token),
          userFullName: getUserFullName(user),
        });
        emailDelivery = { status: "sent", recipient: data.email };
      } catch (error) {
        emailDelivery = {
          status: "failed",
          recipient: data.email,
          error: getInviteEmailErrorMessage(error),
        };
      }
    }

    revalidatePath(USERS_PATH);

    return {
      user,
      inviteToken: token,
      emailDelivery,
    };
  } catch (e: unknown) {
    rethrowIfNextControlFlow(e);

    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      return { error: "Пользователь с таким email уже существует" };
    }
    throw e;
  }
}

export async function generateParentInviteAction(
  studentId: string
): Promise<Result<{ token: string; parentUserId: string }>> {
  await requireAdminContext();

  const parsed = generateParentInviteSchema.safeParse({ studentId });
  if (!parsed.success) {
    return err("Некорректный ID ученика");
  }

  const result = await createParentInviteForStudent(studentId);

  if (result.error) {
    return err(result.error);
  }

  revalidatePath(USERS_PATH);

  return ok(result.result!);
}

export async function linkExistingParentAction(
  studentId: string,
  parentId: string,
) {
  await requireAdminContext();

  const parsed = linkExistingParentSchema.safeParse({ studentId, parentId });
  if (!parsed.success) {
    return { error: "Некорректные данные" };
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  const parent = await prisma.parent.findUnique({ where: { id: parentId } });

  if (!student || !parent) {
    return { error: "Ученик или родитель не найдены" };
  }

  const existing = await prisma.studentParents.findUnique({
    where: {
      parentId_studentId: { parentId: parent.id, studentId: student.id },
    },
  });

  if (existing) {
    return { error: "Этот родитель уже привязан к ученику" };
  }

  await prisma.studentParents.create({
    data: { parentId: parent.id, studentId: student.id },
  });

  revalidatePath(USERS_PATH);
  return { success: true };
}

export async function updateUserAction(input: UpdateUserInput) {
  await requireAdminContext();

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: data.id },
      data: {
        surname: data.surname,
        name: data.name,
        patronymicName: data.patronymicName || null,
        email: data.email || null,
        role: data.systemRole,
      },
    });

    const existingTeacher = await tx.teacher.findFirst({
      where: { userId: data.id },
    });
    if (data.isTeacher && !existingTeacher) {
      await tx.teacher.create({ data: { userId: data.id } });
    } else if (!data.isTeacher && existingTeacher) {
      await tx.teacher.delete({ where: { id: existingTeacher.id } });
    }

    const existingStudent = await tx.student.findFirst({
      where: { userId: data.id },
    });
    if (data.isStudent && !existingStudent) {
      await tx.student.create({ data: { userId: data.id } });
    } else if (!data.isStudent && existingStudent) {
      await tx.student.delete({ where: { id: existingStudent.id } });
    }

    const existingParent = await tx.parent.findFirst({
      where: { userId: data.id },
    });
    if (data.isParent && !existingParent) {
      await tx.parent.create({ data: { userId: data.id } });
    } else if (!data.isParent && existingParent) {
      await tx.studentParents.deleteMany({
        where: { parentId: existingParent.id },
      });
      await tx.parent.delete({ where: { id: existingParent.id } });
    }
  });

  revalidatePath(USERS_PATH);
  return { success: true };
}

export async function toggleUserStatusAction(id: string) {
  await requireAdminContext();

  const user = await prisma.user.findUniqueOrThrow({ where: { id }, select: { status: true } });

  if (user.status === "PENDING_INVITE") {
    return { error: "Невозможно заблокировать ожидающего пользователя" };
  }

  const newStatus = user.status === "DISABLED" ? "ACTIVE" : "DISABLED";

  await prisma.user.update({
    where: { id },
    data: { status: newStatus },
  });

  revalidatePath(USERS_PATH);
  return { success: true };
}

export async function deleteUserAction(id: string, confirmName: string) {
  await requireAdminContext();

  const parsed = deleteUserSchema.safeParse({ id, confirmName });
  if (!parsed.success) {
    return { error: "Введите имя для подтверждения" };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return { error: "Пользователь не найден" };
  }

  const fullName = [user.surname, user.name].filter(Boolean).join(" ");
  if (confirmName.trim() !== fullName) {
    return { error: `Введённое имя не совпадает. Ожидалось: "${fullName}"` };
  }

  await prisma.user.delete({ where: { id } });

  revalidatePath(USERS_PATH);
  return { success: true };
}

export async function searchParentsAction(query: string) {
  await requireAdminContext();

  if (!query || query.length < 2) return [];

  return prisma.parent.findMany({
    where: {
      user: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { surname: { contains: query, mode: "insensitive" } },
          { patronymicName: { contains: query, mode: "insensitive" } },
        ],
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          surname: true,
          patronymicName: true,
          email: true,
        },
      },
      studentParents: {
        include: {
          student: {
            include: { user: { select: { name: true, surname: true } } },
          },
        },
      },
    },
    take: 10,
  });
}

export async function getInviteTokenAction(userId: string) {
  await requireAdminContext();

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { error: "Пользователь не найден" };
    }

    const verification = await prisma.verification.findFirst({
      where: {
        identifier: userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: "desc" },
    });

    if (verification) {
      return { token: verification.value };
    }

    const newToken = await createStaffInviteToken(prisma, userId);

    return { token: newToken };
  } catch (error) {
    rethrowIfNextControlFlow(error);
    console.error("Ошибка при получении инвайт-токена:", error);
    return { error: "Не удалось получить инвайт-ссылку" };
  }
}

export async function sendUserInviteEmailAction(userId: string) {
  await requireAdminContext();

  const parsed = sendUserInviteEmailSchema.safeParse({ userId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Некорректный ID пользователя" };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user) {
      return { error: "Пользователь не найден" };
    }

    if (user.status !== "PENDING_INVITE") {
      return { error: "Инвайт можно отправить только пользователю, ожидающему активации" };
    }

    if (!hasRealInviteEmail(user.email)) {
      return { error: "У пользователя нет email для отправки инвайта" };
    }

    const token = await getOrCreateActiveStaffInviteToken(prisma, user.id);

    try {
      await sendInviteEmail({
        to: user.email,
        inviteUrl: buildServerInviteUrl(token),
        userFullName: getUserFullName(user),
      });
    } catch (error) {
      return {
        error: getInviteEmailErrorMessage(error),
        token,
      };
    }

    return { success: true, recipient: user.email };
  } catch (error) {
    rethrowIfNextControlFlow(error);
    console.error("Ошибка при отправке инвайта на email:", error);
    return { error: "Не удалось отправить инвайт на email" };
  }
}
