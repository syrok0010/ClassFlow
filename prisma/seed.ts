import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { hashPassword } from "better-auth/crypto";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function createCredentialAccount(userId: string, password: string) {
  const hashedPassword = await hashPassword(password);

  await prisma.account.create({
    data: {
      userId,
      accountId: userId,
      providerId: "credential",
      password: hashedPassword,
    },
  });
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function dateAtMinutes(baseDate: Date, minutesFromMidnight: number) {
  const date = new Date(baseDate);
  date.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0);
  return date;
}

async function main() {
  console.log("Clearing existing data...");
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
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  console.log("Creating mock data...");

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
  await createCredentialAccount(admin.id, "admin1234");

  const subjectSeed = [
    { name: "Математика", type: "ACADEMIC" },
    { name: "Русский язык", type: "ACADEMIC" },
    { name: "Литература", type: "ACADEMIC" },
    { name: "Каллиграфия", type: "ACADEMIC" },
    { name: "Окружающий мир", type: "ACADEMIC" },
    { name: "Английский язык", type: "ACADEMIC" },
    { name: "Физическая культура", type: "ACADEMIC" },
    { name: "Биология", type: "ACADEMIC" },
    { name: "География", type: "ACADEMIC" },
    { name: "История", type: "ACADEMIC" },
    { name: "Коммуникация", type: "ACADEMIC" },
    { name: "Испанский язык", type: "ACADEMIC" },
    { name: "Музыка", type: "ACADEMIC" },
    { name: "ИЗО", type: "ACADEMIC" },
    { name: "Фехтование", type: "ACADEMIC" },
    { name: "Фланкировка", type: "ACADEMIC" },
    { name: "Архитектура", type: "ELECTIVE_REQUIRED" },
    { name: "Хореография", type: "ELECTIVE_REQUIRED" },
    { name: "Йога", type: "ELECTIVE_OPTIONAL" },
    { name: "Арт-терапия", type: "ELECTIVE_OPTIONAL" },
    { name: "Игры радости", type: "ELECTIVE_OPTIONAL" },
    { name: "Эксперименты", type: "ELECTIVE_REQUIRED" },
    { name: "Рукоделие", type: "ELECTIVE_OPTIONAL" },
    { name: "Столярная мастерская", type: "ELECTIVE_OPTIONAL" },
    { name: "Кулинария", type: "ELECTIVE_OPTIONAL" },
    { name: "Шахматы и шашки", type: "ELECTIVE_OPTIONAL" },
    { name: "Журналистика", type: "ELECTIVE_OPTIONAL" },
    { name: "Писательский клуб", type: "ELECTIVE_OPTIONAL" },
    { name: "Театр", type: "ELECTIVE_OPTIONAL" },
    { name: "Подвижные игры", type: "ELECTIVE_OPTIONAL" },
    { name: "Урок доброты и мудрости", type: "ELECTIVE_OPTIONAL" },
    { name: "ДЗ", type: "REGIME" },
    { name: "Прогулка", type: "REGIME" },
    { name: "Завтрак", type: "REGIME" },
    { name: "Обед", type: "REGIME" },
    { name: "Полдник", type: "REGIME" },
  ] as const;

  const subjectByName: Record<string, string> = {};
  for (const subject of subjectSeed) {
    const created = await prisma.subject.create({
      data: {
        name: subject.name,
        type: subject.type,
      },
    });
    subjectByName[subject.name] = created.id;
  }

  const mainBuilding = await prisma.building.create({ data: { name: "Главный корпус", address: "ул. Школьная, 1" } });
  const sportsBuilding = await prisma.building.create({ data: { name: "Спортивный корпус", address: "ул. Школьная, 3" } });
  const artsBuilding = await prisma.building.create({ data: { name: "Творческий центр", address: "ул. Школьная, 5" } });

  const roomSeed = [
    { key: "CLASS_3", name: "Кабинет 3А", seatsCount: 28, buildingId: mainBuilding.id },
    { key: "CLASS_6", name: "Кабинет 6А", seatsCount: 30, buildingId: mainBuilding.id },
    { key: "MATH", name: "Кабинет математики", seatsCount: 26, buildingId: mainBuilding.id },
    { key: "RUS", name: "Кабинет русского языка", seatsCount: 26, buildingId: mainBuilding.id },
    { key: "LIT", name: "Литературная студия", seatsCount: 22, buildingId: mainBuilding.id },
    { key: "BIO", name: "Кабинет биологии", seatsCount: 24, buildingId: mainBuilding.id },
    { key: "HISTORY", name: "Кабинет истории и географии", seatsCount: 24, buildingId: mainBuilding.id },
    { key: "ENGLISH_1", name: "Лингафонный кабинет 1", seatsCount: 20, buildingId: mainBuilding.id },
    { key: "ENGLISH_2", name: "Лингафонный кабинет 2", seatsCount: 20, buildingId: mainBuilding.id },
    { key: "COMM", name: "Кабинет коммуникации", seatsCount: 20, buildingId: mainBuilding.id },
    { key: "PROJECT", name: "Проектная мастерская", seatsCount: 18, buildingId: artsBuilding.id },
    { key: "SCIENCE", name: "Лаборатория экспериментов", seatsCount: 18, buildingId: mainBuilding.id },
    { key: "WOOD", name: "Столярная мастерская", seatsCount: 16, buildingId: artsBuilding.id },
    { key: "CRAFT", name: "Кабинет рукоделия", seatsCount: 16, buildingId: artsBuilding.id },
    { key: "ART", name: "Арт-студия", seatsCount: 20, buildingId: artsBuilding.id },
    { key: "DANCE", name: "Зал хореографии", seatsCount: 30, buildingId: sportsBuilding.id },
    { key: "YOGA", name: "Зал йоги", seatsCount: 24, buildingId: sportsBuilding.id },
    { key: "FENCING", name: "Зал фехтования", seatsCount: 24, buildingId: sportsBuilding.id },
    { key: "GYM", name: "Спортивный зал", seatsCount: 50, buildingId: sportsBuilding.id },
    { key: "THEATER", name: "Театральная сцена", seatsCount: 40, buildingId: artsBuilding.id },
    { key: "MEDIA", name: "Медиа-центр", seatsCount: 20, buildingId: artsBuilding.id },
    { key: "KITCHEN", name: "Кулинарная лаборатория", seatsCount: 16, buildingId: artsBuilding.id },
    { key: "AFTERSCHOOL_3", name: "Комната продлёнки 3-х классов", seatsCount: 20, buildingId: mainBuilding.id },
    { key: "AFTERSCHOOL_6", name: "Комната проектной работы 6-х классов", seatsCount: 20, buildingId: mainBuilding.id },
    { key: "YARD_3", name: "Школьный двор младших классов", seatsCount: 120, buildingId: mainBuilding.id },
    { key: "YARD_6", name: "Школьный двор средних классов", seatsCount: 120, buildingId: mainBuilding.id },
    { key: "CANTEEN", name: "Столовая", seatsCount: 150, buildingId: mainBuilding.id },
  ] as const;

  const roomByKey: Record<string, string> = {};
  for (const room of roomSeed) {
    const { key, ...roomData } = room;
    const created = await prisma.room.create({ data: roomData });
    roomByKey[room.key] = created.id;
  }

  let teacherCounter = 1;
  const teacherByKey: Record<string, string> = {};
  const createTeacher = async (
    key: string,
    name: string,
    surname: string,
    patronymicName: string,
    withCredential = false,
  ) => {
    const user = await prisma.user.create({
      data: {
        email: `teacher${teacherCounter}@classflow.local`,
        role: "USER",
        status: "ACTIVE",
        name,
        surname,
        patronymicName,
      },
    });

    if (withCredential) {
      await createCredentialAccount(user.id, "teacher1234");
    }

    teacherCounter += 1;
    const teacher = await prisma.teacher.create({ data: { userId: user.id } });
    teacherByKey[key] = teacher.id;
    return teacher.id;
  };

  await createTeacher("C3_MATH", "Иван", "Иванов", "Андреевич", true);
  await createTeacher("C3_RUS", "Ольга", "Смирнова", "Павловна", true);
  await createTeacher("C3_LIT", "Марина", "Козлова", "Игоревна");
  await createTeacher("C3_CALLIG", "Наталья", "Тихонова", "Сергеевна");
  await createTeacher("C3_WORLD", "Елена", "Громова", "Николаевна");
  await createTeacher("C3_ENGLISH", "Анна", "Петрова", "Ильинична", true);
  await createTeacher("C3_PE", "Пётр", "Кузьмин", "Олегович");
  await createTeacher("C3_ARCH", "София", "Беляева", "Алексеевна");
  await createTeacher("C3_GAMES", "Андрей", "Фролов", "Владимирович");
  await createTeacher("C3_MUSIC", "Ирина", "Миронова", "Юрьевна");
  await createTeacher("C3_DANCE", "Дарья", "Артемьева", "Станиславовна");
  await createTeacher("C3_CRAFT", "Юлия", "Серова", "Михайловна");
  await createTeacher("C3_WOOD", "Глеб", "Матвеев", "Романович");
  await createTeacher("C3_FENCING", "Константин", "Лебедев", "Игоревич");
  await createTeacher("C3_ART", "Лилия", "Егорова", "Романовна");
  await createTeacher("C3_ART_THERAPY", "Вероника", "Савина", "Евгеньевна");
  await createTeacher("C3_YOGA", "Алёна", "Зимина", "Олеговна");
  await createTeacher("C3_KINDNESS", "Вера", "Шевцова", "Петровна");
  await createTeacher("C3_COOKING", "Тамара", "Молчанова", "Ильинична");
  await createTeacher("C3_CHESS", "Сергей", "Носов", "Валерьевич");
  await createTeacher("C3_HOMEWORK", "Нина", "Белова", "Геннадьевна");
  await createTeacher("C3_WALK", "Галина", "Полякова", "Викторовна");
  await createTeacher("C3_EXPERIMENT", "Виктор", "Андреев", "Аркадьевич");

  await createTeacher("C6_MATH", "Дмитрий", "Орлов", "Петрович");
  await createTeacher("C6_BIO", "Оксана", "Левина", "Игоревна");
  await createTeacher("C6_RUS", "Татьяна", "Киреева", "Андреевна");
  await createTeacher("C6_LIT", "Евгений", "Лапшин", "Сергеевич");
  await createTeacher("C6_ART", "Алиса", "Власова", "Романовна");
  await createTeacher("C6_YOGA", "Инна", "Широкова", "Сергеевна");
  await createTeacher("C6_DANCE", "Кира", "Тарасова", "Павловна");
  await createTeacher("C6_JOURNAL", "Роман", "Давыдов", "Алексеевич");
  await createTeacher("C6_FLANK", "Илья", "Щербаков", "Олегович");
  await createTeacher("C6_GEOGRAPHY", "Светлана", "Денисова", "Юрьевна");
  await createTeacher("C6_ENGLISH", "Маргарита", "Осипова", "Николаевна");
  await createTeacher("C6_HISTORY", "Павел", "Гурьев", "Витальевич");
  await createTeacher("C6_COMM", "Лариса", "Крылова", "Владиславовна");
  await createTeacher("C6_SPANISH", "Диана", "Королёва", "Андреевна");
  await createTeacher("C6_JOY", "Олеся", "Голубева", "Олеговна");
  await createTeacher("C6_ARCH", "Степан", "Макаров", "Егорович");
  await createTeacher("C6_WOOD", "Ярослав", "Калинин", "Викторович");
  await createTeacher("C6_CRAFT", "Екатерина", "Рожкова", "Юрьевна");
  await createTeacher("C6_THEATER", "Михаил", "Гаврилов", "Леонидович");
  await createTeacher("C6_WRITERS", "Полина", "Виноградова", "Олеговна");

  const class3 = await prisma.group.create({ data: { name: "3 А", type: "CLASS", grade: 3 } });
  const class6 = await prisma.group.create({ data: { name: "6 А", type: "CLASS", grade: 6 } });
  const class4 = await prisma.group.create({ data: { name: "4 Б", type: "CLASS", grade: 4 } });
  const class8 = await prisma.group.create({ data: { name: "8 А", type: "CLASS", grade: 8 } });

  const class3Subgroup1 = await prisma.group.create({
    data: {
      name: "3 А - подгруппа 1",
      type: "SUBJECT_SUBGROUP",
      grade: 3,
      parentId: class3.id,
      subjectId: subjectByName["Английский язык"],
    },
  });
  const class3Subgroup2 = await prisma.group.create({
    data: {
      name: "3 А - подгруппа 2",
      type: "SUBJECT_SUBGROUP",
      grade: 3,
      parentId: class3.id,
      subjectId: subjectByName["Математика"],
    },
  });
  const class6Subgroup1 = await prisma.group.create({
    data: {
      name: "6 А - подгруппа 1",
      type: "SUBJECT_SUBGROUP",
      grade: 6,
      parentId: class6.id,
      subjectId: subjectByName["Испанский язык"],
    },
  });
  const class6Subgroup2 = await prisma.group.create({
    data: {
      name: "6 А - подгруппа 2",
      type: "SUBJECT_SUBGROUP",
      grade: 6,
      parentId: class6.id,
      subjectId: subjectByName["Игры радости"],
    },
  });

  const electiveChess = await prisma.group.create({
    data: {
      name: "Шахматный клуб 3-6",
      type: "ELECTIVE_GROUP",
      grade: 3,
      subjectId: subjectByName["Шахматы и шашки"],
    },
  });
  const electiveMedia = await prisma.group.create({
    data: {
      name: "Медиаклуб",
      type: "ELECTIVE_GROUP",
      grade: 6,
      subjectId: subjectByName["Журналистика"],
    },
  });
  const kindergarten = await prisma.group.create({
    data: {
      name: "Подготовительная группа 'Солнышко'",
      type: "KINDERGARTEN_GROUP",
      grade: 0,
    },
  });

  let studentCounter = 1;
  const allStudents: string[] = [];

  const createStudent = async (
    name: string,
    surname: string,
    groups: string[],
    status: "ACTIVE" | "PENDING_INVITE" = "ACTIVE",
    withCredential = false,
  ) => {
    const user = await prisma.user.create({
      data: {
        email: `student${studentCounter}@classflow.local`,
        role: "USER",
        status,
        name,
        surname,
      },
    });

    if (withCredential) {
      await createCredentialAccount(user.id, "student1234");
    }

    const student = await prisma.student.create({ data: { userId: user.id } });
    allStudents.push(student.id);

    await prisma.studentGroups.createMany({
      data: groups.map((groupId) => ({ studentId: student.id, groupId })),
    });

    studentCounter += 1;
    return student.id;
  };

  const class3Students = [
    ["Михаил", "Кузнецов"],
    ["Александр", "Соколов"],
    ["Мария", "Попова"],
    ["Дарья", "Волкова"],
    ["Павел", "Козлов"],
    ["Ева", "Исаева"],
    ["Лев", "Герасимов"],
    ["Виктория", "Крылова"],
    ["Тимофей", "Поляков"],
    ["Яна", "Мельникова"],
    ["Максим", "Соболев"],
    ["Арина", "Сафонова"],
  ] as const;

  for (const [name, surname] of class3Students) {
    await createStudent(name, surname, [class3.id], "ACTIVE", allStudents.length === 0);
  }

  const class6Students = [
    ["Никита", "Фомин"],
    ["Ксения", "Николаева"],
    ["Григорий", "Седов"],
    ["Алина", "Жукова"],
    ["Матвей", "Абрамов"],
    ["Диана", "Ермакова"],
    ["Илья", "Сазонов"],
    ["Олеся", "Лукина"],
    ["Роман", "Селиванов"],
    ["Анна", "Климова"],
    ["Денис", "Новиков"],
    ["Софья", "Чистякова"],
  ] as const;

  for (const [name, surname] of class6Students) {
    await createStudent(name, surname, [class6.id]);
  }

  await createStudent("Егор", "Лазарев", [class4.id]);
  await createStudent("Полина", "Галкина", [class4.id]);
  await createStudent("Захар", "Доронин", [class8.id], "PENDING_INVITE");
  await createStudent("Милана", "Аксенова", [class8.id]);
  await createStudent("Кирилл", "Панин", [kindergarten.id]);
  await createStudent("Валерия", "Щукина", [electiveChess.id, class3.id]);
  await createStudent("Фёдор", "Колесников", [electiveMedia.id, class6.id]);

  const parent1User = await prisma.user.create({
    data: {
      email: "parent1@classflow.local",
      role: "USER",
      status: "ACTIVE",
      name: "Ольга",
      surname: "Кузнецова",
      patronymicName: "Сергеевна",
    },
  });
  await createCredentialAccount(parent1User.id, "parent1234");
  const parent1 = await prisma.parent.create({ data: { userId: parent1User.id } });

  const parent2User = await prisma.user.create({
    data: {
      email: "parent2@classflow.local",
      role: "USER",
      status: "PENDING_INVITE",
      name: "Андрей",
      surname: "Соколов",
      patronymicName: "Викторович",
    },
  });
  const parent2 = await prisma.parent.create({ data: { userId: parent2User.id } });

  await prisma.studentParents.createMany({
    data: [
      { parentId: parent1.id, studentId: allStudents[0] },
      { parentId: parent2.id, studentId: allStudents[1] },
    ],
  });

  type TemplateSeed = {
    dayOfWeek: number;
    start: string;
    end: string;
    groupId: string;
    subjectName: string;
    roomId: string | null;
    teacherId: string | null;
    grade: number;
  };

  const weeklyTemplateSeed: TemplateSeed[] = [];

  const addTemplate = (
    dayOfWeek: number,
    start: string,
    end: string,
    groupId: string,
    subjectName: string,
    roomId: string | null,
    teacherId: string | null,
    grade: number,
  ) => {
    weeklyTemplateSeed.push({ dayOfWeek, start, end, groupId, subjectName, roomId, teacherId, grade });
  };

  // 3A schedule
  addTemplate(1, "08:20", "09:05", class3.id, "Математика", roomByKey.CLASS_3, teacherByKey.C3_MATH, 3);
  addTemplate(1, "09:20", "10:05", class3.id, "Русский язык", roomByKey.CLASS_3, teacherByKey.C3_RUS, 3);
  addTemplate(1, "10:05", "10:20", class3.id, "Завтрак", roomByKey.CANTEEN, null, 3);
  addTemplate(1, "10:20", "11:05", class3.id, "Литература", roomByKey.CLASS_3, teacherByKey.C3_LIT, 3);
  addTemplate(1, "11:20", "12:05", class3.id, "Каллиграфия", roomByKey.CRAFT, teacherByKey.C3_CALLIG, 3);
  addTemplate(1, "12:20", "13:05", class3.id, "Окружающий мир", roomByKey.CLASS_3, teacherByKey.C3_WORLD, 3);
  addTemplate(1, "13:05", "13:20", class3.id, "Обед", roomByKey.CANTEEN, null, 3);
  addTemplate(1, "13:20", "14:05", class3Subgroup1.id, "Прогулка", roomByKey.YARD_3, teacherByKey.C3_WALK, 3);
  addTemplate(1, "13:20", "14:05", class3Subgroup2.id, "Эксперименты", roomByKey.SCIENCE, teacherByKey.C3_EXPERIMENT, 3);
  addTemplate(1, "14:05", "15:00", class3Subgroup1.id, "Эксперименты", roomByKey.SCIENCE, teacherByKey.C3_EXPERIMENT, 3);
  addTemplate(1, "14:05", "15:00", class3Subgroup2.id, "Прогулка", roomByKey.YARD_3, teacherByKey.C3_WALK, 3);
  addTemplate(1, "15:00", "15:15", class3.id, "Полдник", null, null, 3);
  addTemplate(1, "15:15", "16:00", class3.id, "ДЗ", roomByKey.AFTERSCHOOL_3, teacherByKey.C3_HOMEWORK, 3);
  addTemplate(1, "17:00", "18:00", class3.id, "Прогулка", roomByKey.YARD_3, teacherByKey.C3_WALK, 3);

  addTemplate(2, "08:20", "09:05", class3Subgroup1.id, "Английский язык", roomByKey.ENGLISH_1, teacherByKey.C3_ENGLISH, 3);
  addTemplate(2, "08:20", "09:05", class3Subgroup2.id, "Математика", roomByKey.CLASS_3, teacherByKey.C3_MATH, 3);
  addTemplate(2, "09:20", "10:05", class3Subgroup1.id, "Математика", roomByKey.CLASS_3, teacherByKey.C3_MATH, 3);
  addTemplate(2, "09:20", "10:05", class3Subgroup2.id, "Английский язык", roomByKey.ENGLISH_1, teacherByKey.C3_ENGLISH, 3);
  addTemplate(2, "10:05", "10:20", class3.id, "Завтрак", roomByKey.CANTEEN, null, 3);
  addTemplate(2, "10:20", "11:05", class3.id, "Русский язык", roomByKey.CLASS_3, teacherByKey.C3_RUS, 3);
  addTemplate(2, "11:20", "12:05", class3.id, "Физическая культура", roomByKey.GYM, teacherByKey.C3_PE, 3);
  addTemplate(2, "12:20", "13:05", class3.id, "Литература", roomByKey.CLASS_3, teacherByKey.C3_LIT, 3);
  addTemplate(2, "13:05", "13:20", class3.id, "Обед", roomByKey.CANTEEN, null, 3);
  addTemplate(2, "13:20", "14:05", class3Subgroup1.id, "Прогулка", roomByKey.YARD_3, teacherByKey.C3_WALK, 3);
  addTemplate(2, "13:20", "14:05", class3Subgroup2.id, "Архитектура", roomByKey.PROJECT, teacherByKey.C3_ARCH, 3);
  addTemplate(2, "14:05", "15:00", class3Subgroup1.id, "Архитектура", roomByKey.PROJECT, teacherByKey.C3_ARCH, 3);
  addTemplate(2, "14:05", "15:00", class3Subgroup2.id, "Прогулка", roomByKey.YARD_3, teacherByKey.C3_WALK, 3);
  addTemplate(2, "15:00", "15:15", class3.id, "Полдник", null, null, 3);
  addTemplate(2, "15:15", "16:00", class3.id, "ДЗ", roomByKey.AFTERSCHOOL_3, teacherByKey.C3_HOMEWORK, 3);
  addTemplate(2, "16:15", "17:00", class3.id, "Подвижные игры", roomByKey.GYM, teacherByKey.C3_GAMES, 3);
  addTemplate(2, "17:00", "18:00", class3.id, "Прогулка", roomByKey.YARD_3, teacherByKey.C3_WALK, 3);

  addTemplate(3, "08:20", "09:05", class3.id, "Математика", roomByKey.CLASS_3, teacherByKey.C3_MATH, 3);
  addTemplate(3, "09:20", "10:05", class3.id, "Русский язык", roomByKey.CLASS_3, teacherByKey.C3_RUS, 3);
  addTemplate(3, "10:05", "10:20", class3.id, "Завтрак", roomByKey.CANTEEN, null, 3);
  addTemplate(3, "10:20", "11:05", class3.id, "Литература", roomByKey.CLASS_3, teacherByKey.C3_LIT, 3);
  addTemplate(3, "11:20", "12:05", class3.id, "Игры радости", roomByKey.AFTERSCHOOL_3, teacherByKey.C3_GAMES, 3);
  addTemplate(3, "12:20", "13:05", class3.id, "Музыка", roomByKey.MEDIA, teacherByKey.C3_MUSIC, 3);
  addTemplate(3, "13:05", "13:20", class3.id, "Обед", roomByKey.CANTEEN, null, 3);
  addTemplate(3, "13:20", "14:05", class3.id, "Прогулка", roomByKey.YARD_3, teacherByKey.C3_WALK, 3);
  addTemplate(3, "14:05", "15:00", class3.id, "Хореография", roomByKey.DANCE, teacherByKey.C3_DANCE, 3);
  addTemplate(3, "15:00", "15:15", class3.id, "Полдник", null, null, 3);
  addTemplate(3, "15:15", "16:00", class3.id, "ДЗ", roomByKey.AFTERSCHOOL_3, teacherByKey.C3_HOMEWORK, 3);
  addTemplate(3, "16:15", "17:00", class3Subgroup1.id, "Рукоделие", roomByKey.CRAFT, teacherByKey.C3_CRAFT, 3);
  addTemplate(3, "16:15", "17:00", class3Subgroup2.id, "Столярная мастерская", roomByKey.WOOD, teacherByKey.C3_WOOD, 3);
  addTemplate(3, "17:00", "18:00", class3.id, "Прогулка", roomByKey.YARD_3, teacherByKey.C3_WALK, 3);

  addTemplate(4, "08:20", "09:05", class3Subgroup1.id, "Английский язык", roomByKey.ENGLISH_1, teacherByKey.C3_ENGLISH, 3);
  addTemplate(4, "08:20", "09:05", class3Subgroup2.id, "Математика", roomByKey.CLASS_3, teacherByKey.C3_MATH, 3);
  addTemplate(4, "09:20", "10:05", class3Subgroup1.id, "Математика", roomByKey.CLASS_3, teacherByKey.C3_MATH, 3);
  addTemplate(4, "09:20", "10:05", class3Subgroup2.id, "Английский язык", roomByKey.ENGLISH_1, teacherByKey.C3_ENGLISH, 3);
  addTemplate(4, "10:05", "10:20", class3.id, "Завтрак", roomByKey.CANTEEN, null, 3);
  addTemplate(4, "10:20", "11:05", class3.id, "Русский язык", roomByKey.CLASS_3, teacherByKey.C3_RUS, 3);
  addTemplate(4, "11:20", "12:05", class3.id, "Фехтование", roomByKey.FENCING, teacherByKey.C3_FENCING, 3);
  addTemplate(4, "12:20", "13:05", class3.id, "Окружающий мир", roomByKey.CLASS_3, teacherByKey.C3_WORLD, 3);
  addTemplate(4, "13:05", "13:20", class3.id, "Обед", roomByKey.CANTEEN, null, 3);
  addTemplate(4, "13:20", "14:05", class3Subgroup1.id, "Прогулка", roomByKey.YARD_3, teacherByKey.C3_WALK, 3);
  addTemplate(4, "13:20", "14:05", class3Subgroup2.id, "ИЗО", roomByKey.ART, teacherByKey.C3_ART, 3);
  addTemplate(4, "14:05", "15:00", class3Subgroup1.id, "ИЗО", roomByKey.ART, teacherByKey.C3_ART, 3);
  addTemplate(4, "14:05", "15:00", class3Subgroup2.id, "Прогулка", roomByKey.YARD_3, teacherByKey.C3_WALK, 3);
  addTemplate(4, "15:00", "15:15", class3.id, "Полдник", null, null, 3);
  addTemplate(4, "15:15", "16:00", class3.id, "ДЗ", roomByKey.AFTERSCHOOL_3, teacherByKey.C3_HOMEWORK, 3);
  addTemplate(4, "16:15", "17:00", class3.id, "Арт-терапия", roomByKey.ART, teacherByKey.C3_ART_THERAPY, 3);
  addTemplate(4, "17:00", "18:00", class3.id, "Прогулка", roomByKey.YARD_3, teacherByKey.C3_WALK, 3);

  addTemplate(5, "08:20", "09:05", class3.id, "Математика", roomByKey.CLASS_3, teacherByKey.C3_MATH, 3);
  addTemplate(5, "09:20", "10:05", class3.id, "Русский язык", roomByKey.CLASS_3, teacherByKey.C3_RUS, 3);
  addTemplate(5, "10:05", "10:20", class3.id, "Завтрак", roomByKey.CANTEEN, null, 3);
  addTemplate(5, "10:20", "11:05", class3.id, "Литература", roomByKey.CLASS_3, teacherByKey.C3_LIT, 3);
  addTemplate(5, "11:20", "12:05", class3.id, "Йога", roomByKey.YOGA, teacherByKey.C3_YOGA, 3);
  addTemplate(5, "12:20", "13:05", class3.id, "Урок доброты и мудрости", roomByKey.AFTERSCHOOL_3, teacherByKey.C3_KINDNESS, 3);
  addTemplate(5, "13:05", "13:20", class3.id, "Обед", roomByKey.CANTEEN, null, 3);
  addTemplate(5, "13:20", "14:05", class3.id, "Прогулка", roomByKey.YARD_3, teacherByKey.C3_WALK, 3);
  addTemplate(5, "14:05", "15:00", class3.id, "Кулинария", roomByKey.KITCHEN, teacherByKey.C3_COOKING, 3);
  addTemplate(5, "15:00", "15:15", class3.id, "Полдник", null, null, 3);
  addTemplate(5, "15:15", "16:00", class3.id, "ДЗ", roomByKey.AFTERSCHOOL_3, teacherByKey.C3_HOMEWORK, 3);
  addTemplate(5, "16:15", "17:00", class3.id, "Шахматы и шашки", roomByKey.MEDIA, teacherByKey.C3_CHESS, 3);
  addTemplate(5, "17:00", "18:00", class3.id, "Прогулка", roomByKey.YARD_3, teacherByKey.C3_WALK, 3);

  // 6A schedule + fixed meal slots
  for (const dayOfWeek of [1, 2, 3, 4, 5]) {
    addTemplate(dayOfWeek, "09:50", "10:05", class6.id, "Завтрак", roomByKey.CANTEEN, null, 6);
    addTemplate(dayOfWeek, "12:50", "13:05", class6.id, "Обед", roomByKey.CANTEEN, null, 6);
    addTemplate(dayOfWeek, "15:00", "15:15", class6.id, "Полдник", null, null, 6);
  }

  addTemplate(1, "08:15", "09:00", class6.id, "Математика", roomByKey.MATH, teacherByKey.C6_MATH, 6);
  addTemplate(1, "09:05", "09:50", class6.id, "Биология", roomByKey.BIO, teacherByKey.C6_BIO, 6);
  addTemplate(1, "10:15", "11:00", class6.id, "Русский язык", roomByKey.RUS, teacherByKey.C6_RUS, 6);
  addTemplate(1, "11:15", "12:00", class6.id, "Литература", roomByKey.LIT, teacherByKey.C6_LIT, 6);
  addTemplate(1, "12:05", "12:50", class6.id, "ИЗО", roomByKey.ART, teacherByKey.C6_ART, 6);
  addTemplate(1, "13:10", "13:55", class6.id, "Йога", roomByKey.YOGA, teacherByKey.C6_YOGA, 6);
  addTemplate(1, "14:05", "15:00", class6.id, "Хореография", roomByKey.DANCE, teacherByKey.C6_DANCE, 6);
  addTemplate(1, "15:15", "16:00", class6.id, "Журналистика", roomByKey.MEDIA, teacherByKey.C6_JOURNAL, 6);

  addTemplate(2, "08:15", "09:00", class6.id, "Фланкировка", roomByKey.FENCING, teacherByKey.C6_FLANK, 6);
  addTemplate(2, "09:05", "09:50", class6.id, "Математика", roomByKey.MATH, teacherByKey.C6_MATH, 6);
  addTemplate(2, "10:15", "11:00", class6.id, "Русский язык", roomByKey.RUS, teacherByKey.C6_RUS, 6);
  addTemplate(2, "11:15", "12:00", class6.id, "География", roomByKey.HISTORY, teacherByKey.C6_GEOGRAPHY, 6);
  addTemplate(2, "12:05", "12:50", class6.id, "География", roomByKey.HISTORY, teacherByKey.C6_GEOGRAPHY, 6);
  addTemplate(2, "13:10", "13:55", class6.id, "Английский язык", roomByKey.ENGLISH_2, teacherByKey.C6_ENGLISH, 6);
  addTemplate(2, "14:05", "15:00", class6.id, "Физическая культура", roomByKey.GYM, teacherByKey.C3_PE, 6);

  addTemplate(3, "08:15", "09:00", class6.id, "Русский язык", roomByKey.RUS, teacherByKey.C6_RUS, 6);
  addTemplate(3, "09:05", "09:50", class6.id, "Литература", roomByKey.LIT, teacherByKey.C6_LIT, 6);
  addTemplate(3, "10:15", "11:00", class6.id, "Математика", roomByKey.MATH, teacherByKey.C6_MATH, 6);
  addTemplate(3, "11:15", "12:00", class6.id, "Математика", roomByKey.MATH, teacherByKey.C6_MATH, 6);
  addTemplate(3, "12:05", "12:50", class6.id, "История", roomByKey.HISTORY, teacherByKey.C6_HISTORY, 6);
  addTemplate(3, "13:10", "13:55", class6.id, "Музыка", roomByKey.MEDIA, teacherByKey.C3_MUSIC, 6);
  addTemplate(3, "14:05", "15:00", class6.id, "История", roomByKey.HISTORY, teacherByKey.C6_HISTORY, 6);
  addTemplate(3, "15:15", "16:00", class6Subgroup1.id, "Арт-терапия", roomByKey.ART, teacherByKey.C3_ART_THERAPY, 6);
  addTemplate(3, "15:15", "16:00", class6Subgroup2.id, "Писательский клуб", roomByKey.AFTERSCHOOL_6, teacherByKey.C6_WRITERS, 6);

  addTemplate(4, "08:15", "09:00", class6.id, "Фехтование", roomByKey.FENCING, teacherByKey.C3_FENCING, 6);
  addTemplate(4, "09:05", "09:50", class6.id, "Русский язык", roomByKey.RUS, teacherByKey.C6_RUS, 6);
  addTemplate(4, "10:15", "11:00", class6.id, "Коммуникация", roomByKey.COMM, teacherByKey.C6_COMM, 6);
  addTemplate(4, "11:15", "12:00", class6.id, "Русский язык", roomByKey.RUS, teacherByKey.C6_RUS, 6);
  addTemplate(4, "12:05", "12:50", class6.id, "Биология", roomByKey.BIO, teacherByKey.C6_BIO, 6);
  addTemplate(4, "13:10", "13:55", class6.id, "Английский язык", roomByKey.ENGLISH_2, teacherByKey.C6_ENGLISH, 6);
  addTemplate(4, "14:05", "15:00", class6Subgroup1.id, "Испанский язык", roomByKey.ENGLISH_2, teacherByKey.C6_SPANISH, 6);
  addTemplate(4, "14:05", "15:00", class6Subgroup2.id, "Игры радости", roomByKey.AFTERSCHOOL_6, teacherByKey.C6_JOY, 6);
  addTemplate(4, "15:15", "17:00", class6.id, "Архитектура", roomByKey.PROJECT, teacherByKey.C6_ARCH, 6);

  addTemplate(5, "08:15", "09:00", class6.id, "Математика", roomByKey.MATH, teacherByKey.C6_MATH, 6);
  addTemplate(5, "09:05", "09:50", class6.id, "Английский язык", roomByKey.ENGLISH_2, teacherByKey.C6_ENGLISH, 6);
  addTemplate(5, "10:15", "11:00", class6.id, "История", roomByKey.HISTORY, teacherByKey.C6_HISTORY, 6);
  addTemplate(5, "11:15", "12:00", class6.id, "Литература", roomByKey.LIT, teacherByKey.C6_LIT, 6);
  addTemplate(5, "12:05", "12:50", class6.id, "Математика", roomByKey.MATH, teacherByKey.C6_MATH, 6);
  addTemplate(5, "13:10", "13:55", class6.id, "Русский язык", roomByKey.RUS, teacherByKey.C6_RUS, 6);
  addTemplate(5, "14:05", "15:00", class6Subgroup1.id, "Столярная мастерская", roomByKey.WOOD, teacherByKey.C6_WOOD, 6);
  addTemplate(5, "14:05", "15:00", class6Subgroup2.id, "Рукоделие", roomByKey.CRAFT, teacherByKey.C6_CRAFT, 6);
  addTemplate(5, "15:15", "16:00", class6.id, "Театр", roomByKey.THEATER, teacherByKey.C6_THEATER, 6);

  const teacherSubjectRows = new Map<string, { teacherId: string; subjectId: string; minGrade: number; maxGrade: number }>();
  for (const lesson of weeklyTemplateSeed) {
    if (!lesson.teacherId) {
      continue;
    }

    const subjectId = subjectByName[lesson.subjectName];
    const key = `${lesson.teacherId}:${subjectId}`;
    const existing = teacherSubjectRows.get(key);

    if (!existing) {
      teacherSubjectRows.set(key, {
        teacherId: lesson.teacherId,
        subjectId,
        minGrade: lesson.grade,
        maxGrade: lesson.grade,
      });
      continue;
    }

    existing.minGrade = Math.min(existing.minGrade, lesson.grade);
    existing.maxGrade = Math.max(existing.maxGrade, lesson.grade);
  }

  await prisma.teacherSubject.createMany({
    data: Array.from(teacherSubjectRows.values()),
  });

  const roomSubjectRows = new Map<string, { roomId: string; subjectId: string }>();
  for (const lesson of weeklyTemplateSeed) {
    if (!lesson.roomId) {
      continue;
    }

    const subjectId = subjectByName[lesson.subjectName];
    const key = `${lesson.roomId}:${subjectId}`;
    if (!roomSubjectRows.has(key)) {
      roomSubjectRows.set(key, { roomId: lesson.roomId, subjectId });
    }
  }

  await prisma.roomSubject.createMany({
    data: Array.from(roomSubjectRows.values()),
  });

  const weeklyRows = weeklyTemplateSeed.map((lesson) => ({
    dayOfWeek: lesson.dayOfWeek,
    startTime: toMinutes(lesson.start),
    endTime: toMinutes(lesson.end),
    groupId: lesson.groupId,
    subjectId: subjectByName[lesson.subjectName],
    teacherId: lesson.teacherId,
    roomId: lesson.roomId,
  }));

  await prisma.weeklyScheduleTemplate.createMany({ data: weeklyRows });

  const groupRows = await prisma.group.findMany({
    where: {
      id: {
        in: [class3.id, class6.id, class3Subgroup1.id, class3Subgroup2.id, class6Subgroup1.id, class6Subgroup2.id],
      },
    },
    select: { id: true, grade: true },
  });
  const gradeByGroupId = new Map(groupRows.map((group) => [group.id, group.grade ?? 0]));

  const subjectTypeById = new Map(
    Object.entries(subjectByName).map(([subjectName, subjectId]) => {
      const subject = subjectSeed.find((item) => item.name === subjectName);
      return [subjectId, subject?.type ?? "ACADEMIC"];
    }),
  );

  const requirementRows = new Map<string, {
    groupId: string;
    subjectId: string;
    lessonsPerWeek: number;
    durationInMinutes: number;
    breakDuration: number;
  }>();

  for (const row of weeklyRows) {
    const grade = gradeByGroupId.get(row.groupId);
    if (grade !== 3 && grade !== 6) {
      continue;
    }

    const subjectType = subjectTypeById.get(row.subjectId);
    if (subjectType === "REGIME") {
      continue;
    }

    const key = `${row.groupId}:${row.subjectId}`;
    const duration = row.endTime - row.startTime;
    const existing = requirementRows.get(key);

    if (!existing) {
      requirementRows.set(key, {
        groupId: row.groupId,
        subjectId: row.subjectId,
        lessonsPerWeek: 1,
        durationInMinutes: duration,
        breakDuration: 0,
      });
      continue;
    }

    existing.lessonsPerWeek += 1;
  }

  await prisma.groupSubjectRequirement.createMany({
    data: Array.from(requirementRows.values()),
  });

  const createdTemplates = await prisma.weeklyScheduleTemplate.findMany({
    where: {
      groupId: {
        in: [class3.id, class6.id, class3Subgroup1.id, class3Subgroup2.id, class6Subgroup1.id, class6Subgroup2.id],
      },
    },
  });

  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  await prisma.scheduleEntry.createMany({
    data: createdTemplates.map((template) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + (template.dayOfWeek - 1));
      return {
        templateId: template.id,
        date,
        startTime: dateAtMinutes(date, template.startTime),
        endTime: dateAtMinutes(date, template.endTime),
        groupId: template.groupId,
        roomId: template.roomId,
        teacherId: template.teacherId,
        subjectId: template.subjectId,
      };
    }),
  });

  console.log("Creating teacher availability data...");

  // Teacher 1 availability (Math/Physics)
  await prisma.teacherAvailability.createMany({
    data: [
      { teacherId: teacher1.id, dayOfWeek: 1, startTime: 8 * 60, endTime: 14 * 60, type: "AVAILABLE" },
      { teacherId: teacher1.id, dayOfWeek: 2, startTime: 9 * 60, endTime: 15 * 60, type: "AVAILABLE" },
      { teacherId: teacher1.id, dayOfWeek: 3, startTime: 8 * 60, endTime: 12 * 60, type: "PREFERRED" },
      { teacherId: teacher1.id, dayOfWeek: 4, startTime: 10 * 60, endTime: 16 * 60, type: "AVAILABLE" },
      { teacherId: teacher1.id, dayOfWeek: 5, startTime: 8 * 60, endTime: 13 * 60, type: "AVAILABLE" },
    ],
  });

  // Teacher 2 availability (PE)
  await prisma.teacherAvailability.createMany({
    data: [
      { teacherId: teacher2.id, dayOfWeek: 1, startTime: 8 * 60, endTime: 16 * 60, type: "AVAILABLE" },
      { teacherId: teacher2.id, dayOfWeek: 2, startTime: 8 * 60, endTime: 16 * 60, type: "AVAILABLE" },
      { teacherId: teacher2.id, dayOfWeek: 3, startTime: 8 * 60, endTime: 16 * 60, type: "AVAILABLE" },
      { teacherId: teacher2.id, dayOfWeek: 4, startTime: 8 * 60, endTime: 16 * 60, type: "AVAILABLE" },
      { teacherId: teacher2.id, dayOfWeek: 5, startTime: 8 * 60, endTime: 16 * 60, type: "AVAILABLE" },
    ],
  });

  // Teacher 3 availability (English)
  await prisma.teacherAvailability.createMany({
    data: [
      { teacherId: teacher3.id, dayOfWeek: 1, startTime: 8 * 60, endTime: 18 * 60, type: "AVAILABLE" },
      { teacherId: teacher3.id, dayOfWeek: 3, startTime: 8 * 60, endTime: 18 * 60, type: "AVAILABLE" },
      { teacherId: teacher3.id, dayOfWeek: 5, startTime: 8 * 60, endTime: 18 * 60, type: "AVAILABLE" },
    ],
  });

  console.log("Creating teacher availability overrides...");

  const today = new Date();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
  nextMonday.setHours(0, 0, 0, 0);

  await prisma.teacherAvailabilityOverride.createMany({
    data: [
      {
        teacherId: teacher1.id,
        type: "UNAVAILABLE",
        startTime: new Date(nextMonday.getTime() + 8 * 60 * 60 * 1000),
        endTime: new Date(nextMonday.getTime() + 12 * 60 * 60 * 1000),
      },
      {
        teacherId: teacher3.id,
        type: "AVAILABLE",
        startTime: new Date(nextMonday.getTime() + 2 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
        endTime: new Date(nextMonday.getTime() + 2 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000),
      }
    ]
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
