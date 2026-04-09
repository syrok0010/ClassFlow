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
      id: "e2e-admin-user",
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
      id: "e2e-teacher-user",
      email: "teacher1@classflow.local",
      role: "USER",
      status: "ACTIVE",
      name: "Иван",
      surname: "Иванов",
      patronymicName: "Иванович",
    },
  });

  const teacherPassword = await hashPassword("teacher1234");
  await prisma.account.create({
    data: {
      userId: teacherUser.id,
      accountId: teacherUser.id,
      providerId: "credential",
      password: teacherPassword,
    },
  });

  const teacher = await prisma.teacher.create({
    data: {
      id: "e2e-teacher-profile",
      userId: teacherUser.id,
    },
  });

  const studentUser = await prisma.user.create({
    data: {
      role: "USER",
      status: "PENDING_INVITE",
      name: "Дарья",
      surname: "Волкова",
    },
  });

  await prisma.student.create({ data: { userId: studentUser.id } });

  return {
    teacherId: teacher.id,
    teacherUserId: teacherUser.id,
  };
}

async function seedGroupsPageFixtures(teacherId: string) {
  const english = await prisma.subject.create({
    data: {
      name: "Английский язык",
      type: "ACADEMIC",
    },
  });

  const roboticsSubject = await prisma.subject.create({
    data: {
      name: "Робототехника",
      type: "ELECTIVE_REQUIRED",
    },
  });

  const mediaStudio = await prisma.subject.create({
    data: {
      name: "Медиастудия",
      type: "ELECTIVE_OPTIONAL",
    },
  });

  const classroomHour = await prisma.subject.create({
    data: {
      name: "Классный час",
      type: "REGIME",
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

  const teacherParentPassword = await hashPassword("teacherparent1234");
  await prisma.account.create({
    data: {
      userId: teacherParentUser.id,
      accountId: teacherParentUser.id,
      providerId: "credential",
      password: teacherParentPassword,
    },
  });

  await prisma.teacher.create({ data: { userId: teacherParentUser.id } });
  const parent = await prisma.parent.create({ data: { userId: teacherParentUser.id } });
  await prisma.studentParents.create({
    data: {
      parentId: parent.id,
      studentId: students[0].id,
    },
  });

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

  const roboticsGroup = await prisma.group.create({
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
      { studentId: students[3].id, groupId: roboticsGroup.id },
    ],
  });

  await prisma.teacherSubject.createMany({
    data: [
      {
        teacherId,
        subjectId: english.id,
        minGrade: 5,
        maxGrade: 11,
      },
      {
        teacherId,
        subjectId: classroomHour.id,
        minGrade: 0,
        maxGrade: 11,
      },
    ],
  });

  return {
    english,
    robotics: roboticsSubject,
    mediaStudio,
    classroomHour,
  };
}

async function main() {
  await clearData();
  const authFixtures = await seedAuthAndUsers();
  await seedGroupsPageFixtures(authFixtures.teacherId);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
