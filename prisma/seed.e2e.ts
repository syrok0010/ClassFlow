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

async function seedGroupsPageFixtures() {
  const english = await prisma.subject.create({
    data: {
      name: "Английский язык",
      type: "ACADEMIC",
    },
  });

  await prisma.subject.create({
    data: {
      name: "Робототехника",
      type: "ACADEMIC",
    },
  });

  const studentUsers = await Promise.all([
    prisma.user.create({
      data: {
        role: "USER",
        status: "ACTIVE",
        name: "Иван",
        surname: "Петров",
        patronymicName: "Ильич",
      },
    }),
    prisma.user.create({
      data: {
        role: "USER",
        status: "ACTIVE",
        name: "Мария",
        surname: "Соколова",
        patronymicName: "Андреевна",
      },
    }),
    prisma.user.create({
      data: {
        role: "USER",
        status: "ACTIVE",
        name: "Олег",
        surname: "Федоров",
        patronymicName: "Сергеевич",
      },
    }),
    prisma.user.create({
      data: {
        role: "USER",
        status: "ACTIVE",
        name: "Анна",
        surname: "Крылова",
        patronymicName: "Павловна",
      },
    }),
    prisma.user.create({
      data: {
        role: "USER",
        status: "ACTIVE",
        name: "Павел",
        surname: "Смирнов",
        patronymicName: "Олегович",
      },
    }),
  ]);

  const students = await Promise.all(
    studentUsers.map((user) =>
      prisma.student.create({
        data: { userId: user.id },
      })
    )
  );

  const class10A = await prisma.group.create({
    data: {
      name: "10 А",
      type: "CLASS",
      grade: 10,
    },
  });

  const class10B = await prisma.group.create({
    data: {
      name: "10 Б",
      type: "CLASS",
      grade: 10,
    },
  });

  const robotics = await prisma.group.create({
    data: {
      name: "Робототехника",
      type: "ELECTIVE_GROUP",
    },
  });

  await prisma.studentGroups.createMany({
    data: [
      { studentId: students[0].id, groupId: class10A.id },
      { studentId: students[1].id, groupId: class10A.id },
      { studentId: students[2].id, groupId: class10A.id },
      { studentId: students[3].id, groupId: class10B.id },
      { studentId: students[4].id, groupId: class10B.id },
      { studentId: students[3].id, groupId: robotics.id },
    ],
  });

  return { english };
}

async function main() {
  await clearData();
  await seedAuthAndUsers();
  await seedGroupsPageFixtures();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
