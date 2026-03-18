import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { hashPassword } from "better-auth/crypto";

const databaseUrl = process.env.DATABASE_URL_E2E;

if (!databaseUrl) {
  throw new Error("DATABASE_URL_E2E is required for E2E seed");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function clearData() {
  await prisma.scheduleEntry.deleteMany();
  await prisma.weeklyScheduleTemplate.deleteMany();
  await prisma.teacherAvailabilityOverride.deleteMany();
  await prisma.teacherAvailability.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.groupSubjectRequirement.deleteMany();
  await prisma.roomSubject.deleteMany();
  await prisma.room.deleteMany();
  await prisma.building.deleteMany();
  await prisma.studentGroups.deleteMany();
  await prisma.group.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.studentParents.deleteMany();
  await prisma.student.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
}

async function seedAuthAndUsers() {
  const admin = await prisma.user.create({
    data: {
      email: "admin1@classflow.local",
      role: "ADMIN",
      status: "ACTIVE",
      name: "Сергей",
      surname: "Сироткин",
      patronymicName: "Владимирович",
    },
  });

  const password = await hashPassword("admin1234");
  await prisma.account.create({
    data: {
      userId: admin.id,
      accountId: admin.id,
      providerId: "credential",
      password,
    },
  });

  const teacherUser = await prisma.user.create({
    data: {
      email: "teacher1@classflow.local",
      role: "USER",
      status: "ACTIVE",
      name: "Иван",
      surname: "Иванов",
      patronymicName: "Иванович",
    },
  });

  await prisma.teacher.create({ data: { userId: teacherUser.id } });

  const studentUser = await prisma.user.create({
    data: {
      role: "USER",
      status: "PENDING_INVITE",
      name: "Дарья",
      surname: "Волкова",
    },
  });

  await prisma.student.create({ data: { userId: studentUser.id } });
}

async function main() {
  await clearData();
  await seedAuthAndUsers();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
