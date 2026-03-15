"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import {
  type CreateUserInput,
  createUserSchema,
  deleteUserSchema,
  generateParentInviteSchema,
  linkExistingParentSchema,
  updateUserSchema,
} from "../_lib/schemas";
import { userInclude, type UsersFilterState } from "../_lib/types";

function generateInviteToken(): string {
  return randomBytes(4)
    .toString("hex")
    .toUpperCase()
    .replace(/(.{4})(.{4})/, "$1-$2");
}

const STAFF_INVITE_TTL_DAYS = 7;
const PARENT_INVITE_TTL_DAYS = 30;

async function createInviteToken(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: string,
  ttlDays: number
) {
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await tx.verification.create({
    data: {
      identifier: userId,
      value: token,
      expiresAt,
    },
  });

  return token;
}

const USERS_PATH = "/admin/users";

export async function getUsersAction(filters?: Partial<UsersFilterState>) {
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

      const newToken = await createInviteToken(tx, newUser.id, STAFF_INVITE_TTL_DAYS);

      return { user: newUser, token: newToken };
    });

    revalidatePath(USERS_PATH);

    return {
      user,
      inviteToken: data.email ? null : token,
    };
  } catch (e: unknown) {
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

export async function generateParentInviteAction(studentId: string) {
  const parsed = generateParentInviteSchema.safeParse({ studentId });
  if (!parsed.success) {
    return { error: "Некорректный ID ученика" };
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });

  if (!student) {
    return { error: "Ученик не найден" };
  }

  const result = await prisma.$transaction(async (tx) => {
    const parentUser = await tx.user.create({
      data: {
        email: `parent-pending-${randomBytes(4).toString("hex")}@classflow.local`,
        status: "PENDING_INVITE",
        role: "USER",
      },
    });

    const parent = await tx.parent.create({
      data: { userId: parentUser.id },
    });

    await tx.studentParents.create({
      data: {
        parentId: parent.id,
        studentId: student.id,
      },
    });

    const token = await createInviteToken(tx, parentUser.id, PARENT_INVITE_TTL_DAYS);

    return { token, parentUserId: parentUser.id };
  });

  revalidatePath(USERS_PATH);

  return result;
}

export async function linkExistingParentAction(
  studentId: string,
  parentId: string,
) {
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

export async function updateUserAction(input: {
  id: string;
  surname: string;
  name: string;
  patronymicName?: string;
  email?: string;
  systemRole: "ADMIN" | "USER";
  isTeacher: boolean;
  isStudent: boolean;
  isParent: boolean;
}) {
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

    const newToken = await createInviteToken(prisma, userId, STAFF_INVITE_TTL_DAYS);

    return { token: newToken };
  } catch (error) {
    console.error("Ошибка при получении инвайт-токена:", error);
    return { error: "Не удалось получить инвайт-ссылку" };
  }
}
