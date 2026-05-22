import { randomBytes } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";

const PARENT_INVITE_TTL_DAYS = 30;
const STAFF_INVITE_TTL_DAYS = 7;

function generateInviteToken(): string {
  return randomBytes(4)
    .toString("hex")
    .toUpperCase()
    .replace(/(.{4})(.{4})/, "$1-$2");
}

export async function createInviteToken(
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

export async function createStaffInviteToken(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: string
) {
  return createInviteToken(tx, userId, STAFF_INVITE_TTL_DAYS);
}

export async function createParentInviteForStudent(
  studentId: string
): Promise<Result<{ token: string; parentUserId: string }>> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });

  if (!student) {
    return err("Ученик не найден");
  }

  return prisma.$transaction(async (tx) => {
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

    return ok({ token, parentUserId: parentUser.id });
  });
}
