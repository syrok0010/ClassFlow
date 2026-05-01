import "dotenv/config";
import { pathToFileURL } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { createCredentialAccount } from "./seed-utils";
import { seedBaseData } from "./seed";

const databaseUrl = process.env.DATABASE_URL_E2E;

if (!databaseUrl) {
  throw new Error("DATABASE_URL_E2E is required for E2E seed");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function seedTeacherParentUser() {
  const student = await prisma.student.findFirst({
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!student) {
    throw new Error("Base seed must create at least one student for teacher-parent fixture");
  }

  const teacherParentUser = await prisma.user.create({
    data: {
      email: "teacher-parent1@classflow.local",
      role: "USER",
      status: "ACTIVE",
      name: "Марина",
      surname: "Орлова",
      patronymicName: "Сергеевна",
    },
  });

  await createCredentialAccount(prisma, teacherParentUser.id, "teacherparent1234");
  await prisma.teacher.create({ data: { userId: teacherParentUser.id } });
  const parent = await prisma.parent.create({ data: { userId: teacherParentUser.id } });

  await prisma.studentParents.create({
    data: {
      parentId: parent.id,
      studentId: student.id,
    },
  });
}

async function seedInviteFixtures() {
  const pendingInviteTeacher = await prisma.user.create({
    data: {
      id: "e2e-invite-teacher-user",
      email: "pending-invite-teacher@classflow.local",
      role: "USER",
      status: "PENDING_INVITE",
      name: "Ожидает",
      surname: "Активации",
    },
  });

  await prisma.teacher.create({ data: { userId: pendingInviteTeacher.id } });
  await prisma.verification.create({
    data: {
      identifier: pendingInviteTeacher.id,
      value: "E2E-HAPPY-INVITE",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const rollbackInviteTeacher = await prisma.user.create({
    data: {
      id: "e2e-invite-teacher-rollback-user",
      email: "pending-rollback-teacher@classflow.local",
      role: "USER",
      status: "PENDING_INVITE",
      name: "Повторная",
      surname: "Активация",
    },
  });

  await prisma.teacher.create({ data: { userId: rollbackInviteTeacher.id } });
  await prisma.verification.create({
    data: {
      identifier: rollbackInviteTeacher.id,
      value: "E2E-ROLLBACK-INVITE",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
}

async function seedE2eFixtures() {
  await seedTeacherParentUser();
  await seedInviteFixtures();
}

async function main() {
  await seedBaseData(prisma);
  await seedE2eFixtures();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
