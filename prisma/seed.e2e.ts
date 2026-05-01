import "dotenv/config";
import { addDays, set, startOfWeek } from "date-fns";
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

async function createCredentialAccount(userId: string, password: string) {
  await prisma.account.create({
    data: {
      userId,
      accountId: userId,
      providerId: "credential",
      password: await hashPassword(password),
    },
  });
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

  await createCredentialAccount(admin.id, "admin1234");

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

  await createCredentialAccount(teacherUser.id, "teacher1234");

  const teacher = await prisma.teacher.create({
    data: {
      id: "e2e-teacher-profile",
      userId: teacherUser.id,
    },
  });

  const parentUser = await prisma.user.create({
    data: {
      email: "parent1@classflow.local",
      role: "USER",
      status: "ACTIVE",
      name: "Елена",
      surname: "Смирнова",
      patronymicName: "Петровна",
    },
  });
  await createCredentialAccount(parentUser.id, "parent1234");
  const parent = await prisma.parent.create({ data: { userId: parentUser.id } });

  const studentPortalUser = await prisma.user.create({
    data: {
      email: "student1@classflow.local",
      role: "USER",
      status: "ACTIVE",
      name: "Дарья",
      surname: "Волкова",
      patronymicName: "Игоревна",
    },
  });
  await createCredentialAccount(studentPortalUser.id, "student1234");
  const studentPortalProfile = await prisma.student.create({ data: { userId: studentPortalUser.id } });

  await prisma.studentParents.create({
    data: {
      parentId: parent.id,
      studentId: studentPortalProfile.id,
    },
  });

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

  return {
    teacherId: teacher.id,
    teacherUserId: teacherUser.id,
    studentPortalId: studentPortalProfile.id,
  };
}

function getCurrentWeekDateTime(dayOfWeek: number, minutesFromMidnight: number) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const date = addDays(weekStart, dayOfWeek - 1);

  return set(date, {
    hours: Math.floor(minutesFromMidnight / 60),
    minutes: minutesFromMidnight % 60,
    seconds: 0,
    milliseconds: 0,
  });
}

async function seedGroupsPageFixtures(teacherId: string, studentPortalId: string) {
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
      { studentId: studentPortalId, groupId: class10A.id },
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

  const mainBuilding = await prisma.building.create({
    data: {
      name: "Главный корпус",
      address: "ул. Школьная, 1",
    },
  });

  const labBuilding = await prisma.building.create({
    data: {
      name: "Лабораторный корпус",
      address: "ул. Школьная, 3",
    },
  });

  const room101 = await prisma.room.create({
    data: {
      name: "Кабинет 101",
      seatsCount: 24,
      buildingId: mainBuilding.id,
    },
  });

  const room102 = await prisma.room.create({
    data: {
      name: "Кабинет 102",
      seatsCount: 18,
      buildingId: mainBuilding.id,
    },
  });

  const roboticsLab = await prisma.room.create({
    data: {
      name: "Лаборатория робототехники",
      seatsCount: 12,
      buildingId: labBuilding.id,
    },
  });

  await prisma.roomSubject.createMany({
    data: [
      { roomId: room101.id, subjectId: english.id },
      { roomId: room102.id, subjectId: classroomHour.id },
      { roomId: roboticsLab.id, subjectId: roboticsSubject.id },
      { roomId: roboticsLab.id, subjectId: mediaStudio.id },
    ],
  });

  const englishTemplate = await prisma.weeklyScheduleTemplate.create({
    data: {
      dayOfWeek: 1,
      startTime: 9 * 60,
      endTime: 9 * 60 + 45,
      groupId: class10A.id,
      roomId: room101.id,
      teacherId,
      subjectId: english.id,
    },
  });

  const classroomHourTemplate = await prisma.weeklyScheduleTemplate.create({
    data: {
      dayOfWeek: 2,
      startTime: 10 * 60,
      endTime: 10 * 60 + 30,
      groupId: class10A.id,
      roomId: room102.id,
      teacherId,
      subjectId: classroomHour.id,
    },
  });

  await prisma.scheduleEntry.createMany({
    data: [
      {
        templateId: englishTemplate.id,
        date: getCurrentWeekDateTime(1, 0),
        startTime: getCurrentWeekDateTime(1, 9 * 60),
        endTime: getCurrentWeekDateTime(1, 9 * 60 + 45),
        groupId: class10A.id,
        roomId: room101.id,
        teacherId,
        subjectId: english.id,
      },
      {
        templateId: classroomHourTemplate.id,
        date: getCurrentWeekDateTime(2, 0),
        startTime: getCurrentWeekDateTime(2, 10 * 60),
        endTime: getCurrentWeekDateTime(2, 10 * 60 + 30),
        groupId: class10A.id,
        roomId: room102.id,
        teacherId,
        subjectId: classroomHour.id,
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
  await seedGroupsPageFixtures(authFixtures.teacherId, authFixtures.studentPortalId);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
