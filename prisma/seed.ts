import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { hashPassword } from "better-auth/crypto";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the development seed");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

type Gender = "MALE" | "FEMALE";
type DayOfWeek = 1 | 2 | 3 | 4 | 5;
type AvailabilityType = "AVAILABLE" | "PREFERRED" | "UNAVAILABLE";
type SubjectType = "ACADEMIC" | "ELECTIVE_REQUIRED" | "ELECTIVE_OPTIONAL" | "REGIME";
type AttendanceLoadMode = "DELIVERY_GROUP_SIZE" | "FULL_CLASS_SIZE" | "AFTERSCHOOL_COEFFICIENT";
type UserStatus = "ACTIVE" | "PENDING_INVITE";

type SubjectSeed = {
  name: string;
  type: SubjectType;
};

type BuildingSeed = {
  key: string;
  name: string;
  address: string;
};

type RoomSeed = {
  key: string;
  name: string;
  seatsCount: number;
  buildingKey: string;
  subjectNames: string[];
};

type AvailabilitySeed = {
  dayOfWeek: DayOfWeek;
  start: string;
  end: string;
  type?: AvailabilityType;
};

type TeacherCapability = {
  subjectName: string;
  minGrade: number | null;
  maxGrade: number | null;
};

type TeacherSeed = {
  key: string;
  firstName: string;
  lastName: string;
  patronymic: string;
  capabilities: TeacherCapability[];
  availability: AvailabilitySeed[];
};

type ClassSeed = {
  key: string;
  name: string;
  grade: number;
};

type StudentSeed = {
  key: string;
  firstName: string;
  gender: Gender;
  familyKey: string;
  surnameMale: string;
  classKey: string;
  portalAccess?: boolean;
};

type SubgroupSeed = {
  key: string;
  name: string;
  classKey: string;
  subjectName: string;
  studentKeys: string[];
};

type ElectiveGroupSeed = {
  key: string;
  name: string;
  subjectName: string;
  lessonsPerWeek: number;
  durationInMinutes: number;
  breakDuration: number;
  studentKeys: string[];
};

type RequirementSeed = {
  groupKey: string;
  subjectName: string;
  lessonsPerWeek: number;
  durationInMinutes: number;
  breakDuration: number;
};

const WEEKDAYS: DayOfWeek[] = [1, 2, 3, 4, 5];

const SUBJECTS: SubjectSeed[] = [
  { name: "Математика", type: "ACADEMIC" },
  { name: "Русский язык", type: "ACADEMIC" },
  { name: "Литература", type: "ACADEMIC" },
  { name: "Окружающий мир", type: "ACADEMIC" },
  { name: "Английский язык", type: "ACADEMIC" },
  { name: "История", type: "ACADEMIC" },
  { name: "География", type: "ACADEMIC" },
  { name: "Биология", type: "ACADEMIC" },
  { name: "Информатика", type: "ACADEMIC" },
  { name: "Музыка", type: "ACADEMIC" },
  { name: "ИЗО", type: "ACADEMIC" },
  { name: "Физическая культура", type: "ACADEMIC" },
  { name: "Каллиграфия", type: "ACADEMIC" },
  { name: "Эксперименты", type: "ELECTIVE_REQUIRED" },
  { name: "Архитектура", type: "ELECTIVE_REQUIRED" },
  { name: "Хореография", type: "ELECTIVE_REQUIRED" },
  { name: "Шахматы", type: "ELECTIVE_OPTIONAL" },
  { name: "Робототехника", type: "ELECTIVE_OPTIONAL" },
  { name: "Театр", type: "ELECTIVE_OPTIONAL" },
  { name: "Кулинария", type: "ELECTIVE_OPTIONAL" },
  { name: "Йога", type: "ELECTIVE_OPTIONAL" },
  { name: "Завтрак", type: "REGIME" },
  { name: "Обед", type: "REGIME" },
  { name: "Полдник", type: "REGIME" },
  { name: "Прогулка", type: "REGIME" },
];

const BUILDINGS: BuildingSeed[] = [
  {
    key: "MAIN",
    name: "Школьный корпус",
    address: "Москва, ул. Лесная, 12",
  },
  {
    key: "CREATIVE",
    name: "Творческий корпус",
    address: "Москва, ул. Лесная, 14",
  },
  {
    key: "SPORT",
    name: "Спортивный корпус",
    address: "Москва, ул. Лесная, 16",
  },
];

const ROOMS: RoomSeed[] = [
  {
    key: "CLASS_2A",
    name: "Кабинет 2А",
    seatsCount: 14,
    buildingKey: "MAIN",
    subjectNames: ["Математика", "Русский язык", "Литература", "Окружающий мир", "Каллиграфия"],
  },
  {
    key: "CLASS_2B",
    name: "Кабинет 2Б",
    seatsCount: 14,
    buildingKey: "MAIN",
    subjectNames: ["Математика", "Русский язык", "Литература", "Окружающий мир", "Каллиграфия"],
  },
  {
    key: "CLASS_3A",
    name: "Кабинет 3А",
    seatsCount: 14,
    buildingKey: "MAIN",
    subjectNames: ["Математика", "Русский язык", "Литература", "Окружающий мир", "Каллиграфия"],
  },
  {
    key: "CLASS_5A",
    name: "Кабинет 5А",
    seatsCount: 16,
    buildingKey: "MAIN",
    subjectNames: ["Математика", "Русский язык", "Литература", "История", "География"],
  },
  {
    key: "CLASS_6A",
    name: "Кабинет 6А",
    seatsCount: 16,
    buildingKey: "MAIN",
    subjectNames: ["Математика", "Русский язык", "Литература", "История", "География"],
  },
  {
    key: "ENGLISH_1",
    name: "Лингафонный кабинет 1",
    seatsCount: 10,
    buildingKey: "MAIN",
    subjectNames: ["Английский язык"],
  },
  {
    key: "ENGLISH_2",
    name: "Лингафонный кабинет 2",
    seatsCount: 10,
    buildingKey: "MAIN",
    subjectNames: ["Английский язык"],
  },
  {
    key: "SCIENCE",
    name: "Лаборатория естествознания",
    seatsCount: 16,
    buildingKey: "MAIN",
    subjectNames: ["Биология", "Эксперименты"],
  },
  {
    key: "MEDIA",
    name: "Медиакабинет",
    seatsCount: 18,
    buildingKey: "MAIN",
    subjectNames: ["Музыка", "Шахматы"],
  },
  {
    key: "DINING",
    name: "Столовая",
    seatsCount: 36,
    buildingKey: "MAIN",
    subjectNames: ["Завтрак", "Обед", "Полдник"],
  },
  {
    key: "YARD",
    name: "Школьный двор",
    seatsCount: 80,
    buildingKey: "MAIN",
    subjectNames: ["Прогулка"],
  },
  {
    key: "ART",
    name: "Арт-мастерская",
    seatsCount: 16,
    buildingKey: "CREATIVE",
    subjectNames: ["ИЗО", "Архитектура"],
  },
  {
    key: "ARCH",
    name: "Архитектурная студия",
    seatsCount: 14,
    buildingKey: "CREATIVE",
    subjectNames: ["Архитектура"],
  },
  {
    key: "COOK",
    name: "Кулинарная студия",
    seatsCount: 12,
    buildingKey: "CREATIVE",
    subjectNames: ["Кулинария"],
  },
  {
    key: "ROBO",
    name: "Роболаборатория",
    seatsCount: 14,
    buildingKey: "CREATIVE",
    subjectNames: ["Информатика", "Робототехника"],
  },
  {
    key: "STAGE",
    name: "Сцена-лекторий",
    seatsCount: 20,
    buildingKey: "CREATIVE",
    subjectNames: ["Театр", "Музыка"],
  },
  {
    key: "GYM",
    name: "Спортзал",
    seatsCount: 30,
    buildingKey: "SPORT",
    subjectNames: ["Физическая культура", "Йога"],
  },
  {
    key: "DANCE",
    name: "Зал хореографии",
    seatsCount: 24,
    buildingKey: "SPORT",
    subjectNames: ["Хореография", "Йога", "Театр"],
  },
];

function onDays(
  days: DayOfWeek[],
  start: string,
  end: string,
  type: AvailabilityType = "AVAILABLE",
): AvailabilitySeed[] {
  return days.map((dayOfWeek) => ({ dayOfWeek, start, end, type }));
}

const TEACHERS: TeacherSeed[] = [
  {
    key: "PRIMARY_GRADE_2",
    firstName: "Мария",
    lastName: "Савельева",
    patronymic: "Ильинична",
    capabilities: [
      { subjectName: "Математика", minGrade: 2, maxGrade: 2 },
      { subjectName: "Русский язык", minGrade: 2, maxGrade: 2 },
      { subjectName: "Литература", minGrade: 2, maxGrade: 2 },
      { subjectName: "Окружающий мир", minGrade: 2, maxGrade: 2 },
      { subjectName: "Каллиграфия", minGrade: 2, maxGrade: 2 },
    ],
    availability: onDays(WEEKDAYS, "08:00", "16:00"),
  },
  {
    key: "PRIMARY_GRADE_3",
    firstName: "Ольга",
    lastName: "Трофимова",
    patronymic: "Николаевна",
    capabilities: [
      { subjectName: "Математика", minGrade: 3, maxGrade: 3 },
      { subjectName: "Русский язык", minGrade: 3, maxGrade: 3 },
      { subjectName: "Литература", minGrade: 3, maxGrade: 3 },
      { subjectName: "Окружающий мир", minGrade: 3, maxGrade: 3 },
    ],
    availability: onDays(WEEKDAYS, "08:00", "16:00"),
  },
  {
    key: "MATH_MIDDLE",
    firstName: "Дмитрий",
    lastName: "Орлов",
    patronymic: "Сергеевич",
    capabilities: [{ subjectName: "Математика", minGrade: 5, maxGrade: 6 }],
    availability: onDays(WEEKDAYS, "08:30", "16:30"),
  },
  {
    key: "HUMANITIES_MIDDLE",
    firstName: "Татьяна",
    lastName: "Киреева",
    patronymic: "Павловна",
    capabilities: [
      { subjectName: "Русский язык", minGrade: 5, maxGrade: 6 },
      { subjectName: "Литература", minGrade: 5, maxGrade: 6 },
    ],
    availability: onDays(WEEKDAYS, "08:30", "16:30"),
  },
  {
    key: "ENGLISH_PRIMARY",
    firstName: "Анна",
    lastName: "Петрова",
    patronymic: "Игоревна",
    capabilities: [{ subjectName: "Английский язык", minGrade: 2, maxGrade: 3 }],
    availability: onDays([1, 2, 3, 4], "08:30", "15:00"),
  },
  {
    key: "ENGLISH_MIDDLE",
    firstName: "Маргарита",
    lastName: "Осипова",
    patronymic: "Олеговна",
    capabilities: [{ subjectName: "Английский язык", minGrade: 5, maxGrade: 6 }],
    availability: onDays(WEEKDAYS, "09:00", "16:00"),
  },
  {
    key: "SOCIAL_SCIENCE",
    firstName: "Светлана",
    lastName: "Денисова",
    patronymic: "Юрьевна",
    capabilities: [
      { subjectName: "История", minGrade: 5, maxGrade: 6 },
      { subjectName: "География", minGrade: 5, maxGrade: 6 },
    ],
    availability: onDays([1, 2, 3, 4, 5], "09:00", "15:30"),
  },
  {
    key: "SCIENCE",
    firstName: "Виктор",
    lastName: "Андреев",
    patronymic: "Аркадьевич",
    capabilities: [
      { subjectName: "Биология", minGrade: 5, maxGrade: 6 },
      { subjectName: "Эксперименты", minGrade: 2, maxGrade: 6 },
    ],
    availability: onDays([2, 3, 4, 5], "09:00", "16:00"),
  },
  {
    key: "MUSIC",
    firstName: "Ирина",
    lastName: "Миронова",
    patronymic: "Юрьевна",
    capabilities: [{ subjectName: "Музыка", minGrade: 2, maxGrade: 6 }],
    availability: onDays([1, 2, 3, 4], "10:00", "16:30"),
  },
  {
    key: "ART_ARCH",
    firstName: "Лилия",
    lastName: "Егорова",
    patronymic: "Романовна",
    capabilities: [
      { subjectName: "ИЗО", minGrade: 2, maxGrade: 6 },
      { subjectName: "Архитектура", minGrade: 2, maxGrade: 6 },
    ],
    availability: onDays([2, 3, 4, 5], "09:30", "17:00"),
  },
  {
    key: "SPORT",
    firstName: "Пётр",
    lastName: "Кузьмин",
    patronymic: "Олегович",
    capabilities: [
      { subjectName: "Физическая культура", minGrade: 2, maxGrade: 6 },
      { subjectName: "Йога", minGrade: 2, maxGrade: 6 },
    ],
    availability: onDays(WEEKDAYS, "08:30", "17:30"),
  },
  {
    key: "STAGE",
    firstName: "Дарья",
    lastName: "Артемьева",
    patronymic: "Станиславовна",
    capabilities: [
      { subjectName: "Хореография", minGrade: 2, maxGrade: 6 },
      { subjectName: "Театр", minGrade: 2, maxGrade: 6 },
    ],
    availability: onDays([1, 2, 3, 4], "12:00", "18:00"),
  },
  {
    key: "CHESS",
    firstName: "Сергей",
    lastName: "Носов",
    patronymic: "Валерьевич",
    capabilities: [{ subjectName: "Шахматы", minGrade: 2, maxGrade: 6 }],
    availability: [
      ...onDays([1, 3], "15:00", "18:00"),
      ...onDays([5], "14:00", "18:00"),
    ],
  },
  {
    key: "ROBOTICS",
    firstName: "Роман",
    lastName: "Давыдов",
    patronymic: "Алексеевич",
    capabilities: [
      { subjectName: "Информатика", minGrade: 5, maxGrade: 6 },
      { subjectName: "Робототехника", minGrade: 5, maxGrade: 6 },
    ],
    availability: onDays([2, 4], "14:00", "18:00"),
  },
  {
    key: "COOKING",
    firstName: "Тамара",
    lastName: "Молчанова",
    patronymic: "Ильинична",
    capabilities: [{ subjectName: "Кулинария", minGrade: 3, maxGrade: 6 }],
    availability: onDays([3, 5], "14:00", "18:00"),
  },
];

const CLASSES: ClassSeed[] = [
  { key: "2A", name: "2 А", grade: 2 },
  { key: "2B", name: "2 Б", grade: 2 },
  { key: "3A", name: "3 А", grade: 3 },
  { key: "5A", name: "5 А", grade: 5 },
  { key: "6A", name: "6 А", grade: 6 },
];

const STUDENTS: StudentSeed[] = [
  { key: "ilya-morozov", firstName: "Илья", gender: "MALE", familyKey: "morozov", surnameMale: "Морозов", classKey: "2A", portalAccess: true },
  { key: "polina-sokolova", firstName: "Полина", gender: "FEMALE", familyKey: "sokolov", surnameMale: "Соколов", classKey: "2A" },
  { key: "artem-nesterov", firstName: "Артём", gender: "MALE", familyKey: "nesterov", surnameMale: "Нестеров", classKey: "2A" },
  { key: "varvara-belyaeva", firstName: "Варвара", gender: "FEMALE", familyKey: "belyaev", surnameMale: "Беляев", classKey: "2A" },
  { key: "timofey-grachev", firstName: "Тимофей", gender: "MALE", familyKey: "grachev", surnameMale: "Грачёв", classKey: "2A" },
  { key: "sofia-ershova", firstName: "София", gender: "FEMALE", familyKey: "ershov", surnameMale: "Ершов", classKey: "2A" },
  { key: "matvey-kolesnikov", firstName: "Матвей", gender: "MALE", familyKey: "kolesnikov", surnameMale: "Колесников", classKey: "2A" },
  { key: "kseniya-ryabova", firstName: "Ксения", gender: "FEMALE", familyKey: "ryabov", surnameMale: "Рябов", classKey: "2A" },
  { key: "lev-maksimov", firstName: "Лев", gender: "MALE", familyKey: "maksimov", surnameMale: "Максимов", classKey: "2A" },
  { key: "alisa-titova", firstName: "Алиса", gender: "FEMALE", familyKey: "titov", surnameMale: "Титов", classKey: "2A" },

  { key: "maria-belova", firstName: "Мария", gender: "FEMALE", familyKey: "belov", surnameMale: "Белов", classKey: "2B" },
  { key: "maksim-sokolov", firstName: "Максим", gender: "MALE", familyKey: "sokolov", surnameMale: "Соколов", classKey: "2B" },
  { key: "daria-zhdanova", firstName: "Дарья", gender: "FEMALE", familyKey: "zhdanov", surnameMale: "Жданов", classKey: "2B" },
  { key: "nikita-pavlov", firstName: "Никита", gender: "MALE", familyKey: "pavlov", surnameMale: "Павлов", classKey: "2B" },
  { key: "eva-fomina", firstName: "Ева", gender: "FEMALE", familyKey: "fomin", surnameMale: "Фомин", classKey: "2B" },
  { key: "miron-denisov", firstName: "Мирон", gender: "MALE", familyKey: "denisov", surnameMale: "Денисов", classKey: "2B" },
  { key: "anna-kotova", firstName: "Анна", gender: "FEMALE", familyKey: "kotov", surnameMale: "Котов", classKey: "2B" },
  { key: "roman-orekhov", firstName: "Роман", gender: "MALE", familyKey: "orekhov", surnameMale: "Орехов", classKey: "2B" },
  { key: "vera-larina", firstName: "Вера", gender: "FEMALE", familyKey: "larin", surnameMale: "Ларин", classKey: "2B" },
  { key: "platon-serov", firstName: "Платон", gender: "MALE", familyKey: "serov", surnameMale: "Серов", classKey: "2B" },

  { key: "egor-belov", firstName: "Егор", gender: "MALE", familyKey: "belov", surnameMale: "Белов", classKey: "3A" },
  { key: "anna-vinogradova", firstName: "Анна", gender: "FEMALE", familyKey: "vinogradov", surnameMale: "Виноградов", classKey: "3A" },
  { key: "taisiya-lapina", firstName: "Таисия", gender: "FEMALE", familyKey: "lapin", surnameMale: "Лапин", classKey: "3A" },
  { key: "gleb-titov", firstName: "Глеб", gender: "MALE", familyKey: "titov", surnameMale: "Титов", classKey: "3A" },
  { key: "ulyana-novikova", firstName: "Ульяна", gender: "FEMALE", familyKey: "novikov", surnameMale: "Новиков", classKey: "3A" },
  { key: "fyodor-alekseev", firstName: "Фёдор", gender: "MALE", familyKey: "alekseev", surnameMale: "Алексеев", classKey: "3A" },
  { key: "mark-kiselev", firstName: "Марк", gender: "MALE", familyKey: "kiselev", surnameMale: "Киселёв", classKey: "3A" },
  { key: "veronika-danilova", firstName: "Вероника", gender: "FEMALE", familyKey: "danilov", surnameMale: "Данилов", classKey: "3A" },
  { key: "mihail-korneev", firstName: "Михаил", gender: "MALE", familyKey: "korneev", surnameMale: "Корнеев", classKey: "3A" },
  { key: "alisa-burova", firstName: "Алиса", gender: "FEMALE", familyKey: "burov", surnameMale: "Буров", classKey: "3A" },
  { key: "stepan-zotov", firstName: "Степан", gender: "MALE", familyKey: "zotov", surnameMale: "Зотов", classKey: "3A" },

  { key: "sofia-morozova", firstName: "София", gender: "FEMALE", familyKey: "morozov", surnameMale: "Морозов", classKey: "5A", portalAccess: true },
  { key: "elisey-abramov", firstName: "Елисей", gender: "MALE", familyKey: "abramov", surnameMale: "Абрамов", classKey: "5A" },
  { key: "alina-kravtsova", firstName: "Алина", gender: "FEMALE", familyKey: "kravtsov", surnameMale: "Кравцов", classKey: "5A" },
  { key: "denis-loginov", firstName: "Денис", gender: "MALE", familyKey: "loginov", surnameMale: "Логинов", classKey: "5A" },
  { key: "varvara-terenteva", firstName: "Варвара", gender: "FEMALE", familyKey: "terentev", surnameMale: "Терентьев", classKey: "5A" },
  { key: "grigoriy-samoylov", firstName: "Григорий", gender: "MALE", familyKey: "samoylov", surnameMale: "Самойлов", classKey: "5A" },
  { key: "lada-kulikova", firstName: "Лада", gender: "FEMALE", familyKey: "kulikov", surnameMale: "Куликов", classKey: "5A" },
  { key: "konstantin-osipov", firstName: "Константин", gender: "MALE", familyKey: "osipov", surnameMale: "Осипов", classKey: "5A" },
  { key: "nika-rudneva", firstName: "Ника", gender: "FEMALE", familyKey: "rudnev", surnameMale: "Руднев", classKey: "5A" },
  { key: "yaroslav-demin", firstName: "Ярослав", gender: "MALE", familyKey: "demin", surnameMale: "Дёмин", classKey: "5A" },

  { key: "kirill-vinogradov", firstName: "Кирилл", gender: "MALE", familyKey: "vinogradov", surnameMale: "Виноградов", classKey: "6A", portalAccess: true },
  { key: "daria-meshcheryakova", firstName: "Дарья", gender: "FEMALE", familyKey: "meshcheryakov", surnameMale: "Мещеряков", classKey: "6A" },
  { key: "matvey-polyakov", firstName: "Матвей", gender: "MALE", familyKey: "polyakov", surnameMale: "Поляков", classKey: "6A" },
  { key: "polina-zimina", firstName: "Полина", gender: "FEMALE", familyKey: "zimin", surnameMale: "Зимин", classKey: "6A" },
  { key: "arseniy-korolev", firstName: "Арсений", gender: "MALE", familyKey: "korolev", surnameMale: "Королёв", classKey: "6A" },
  { key: "margarita-egorova", firstName: "Маргарита", gender: "FEMALE", familyKey: "egorov", surnameMale: "Егоров", classKey: "6A" },
  { key: "nikita-chernov", firstName: "Никита", gender: "MALE", familyKey: "chernov", surnameMale: "Чернов", classKey: "6A" },
  { key: "olesya-safonova", firstName: "Олеся", gender: "FEMALE", familyKey: "safonov", surnameMale: "Сафонов", classKey: "6A" },
  { key: "timur-shcherbakov", firstName: "Тимур", gender: "MALE", familyKey: "shcherbakov", surnameMale: "Щербаков", classKey: "6A" },
  { key: "anastasia-markova", firstName: "Анастасия", gender: "FEMALE", familyKey: "markov", surnameMale: "Марков", classKey: "6A", portalAccess: true },
];

const SUBGROUPS: SubgroupSeed[] = [
  {
    key: "2A_ENG_1",
    name: "2 А / Английский 1",
    classKey: "2A",
    subjectName: "Английский язык",
    studentKeys: ["ilya-morozov", "artem-nesterov", "timofey-grachev", "matvey-kolesnikov", "lev-maksimov"],
  },
  {
    key: "2A_ENG_2",
    name: "2 А / Английский 2",
    classKey: "2A",
    subjectName: "Английский язык",
    studentKeys: ["polina-sokolova", "varvara-belyaeva", "sofia-ershova", "kseniya-ryabova", "alisa-titova"],
  },
  {
    key: "3A_ENG_1",
    name: "3 А / Английский 1",
    classKey: "3A",
    subjectName: "Английский язык",
    studentKeys: ["egor-belov", "gleb-titov", "fyodor-alekseev", "mark-kiselev", "mihail-korneev", "stepan-zotov"],
  },
  {
    key: "3A_ENG_2",
    name: "3 А / Английский 2",
    classKey: "3A",
    subjectName: "Английский язык",
    studentKeys: ["anna-vinogradova", "taisiya-lapina", "ulyana-novikova", "veronika-danilova", "alisa-burova"],
  },
  {
    key: "5A_ENG_1",
    name: "5 А / Английский 1",
    classKey: "5A",
    subjectName: "Английский язык",
    studentKeys: ["elisey-abramov", "denis-loginov", "grigoriy-samoylov", "konstantin-osipov", "yaroslav-demin"],
  },
  {
    key: "5A_ENG_2",
    name: "5 А / Английский 2",
    classKey: "5A",
    subjectName: "Английский язык",
    studentKeys: ["sofia-morozova", "alina-kravtsova", "varvara-terenteva", "lada-kulikova", "nika-rudneva"],
  },
];

const ELECTIVE_GROUPS: ElectiveGroupSeed[] = [
  {
    key: "CHESS_CLUB",
    name: "Шахматный клуб 2-3 классов",
    subjectName: "Шахматы",
    lessonsPerWeek: 2,
    durationInMinutes: 45,
    breakDuration: 0,
    studentKeys: [
      "ilya-morozov",
      "polina-sokolova",
      "maria-belova",
      "maksim-sokolov",
      "egor-belov",
      "mark-kiselev",
      "alisa-burova",
    ],
  },
  {
    key: "ROBOTICS_LAB",
    name: "Роболаборатория 5-6 классов",
    subjectName: "Робототехника",
    lessonsPerWeek: 2,
    durationInMinutes: 60,
    breakDuration: 0,
    studentKeys: [
      "elisey-abramov",
      "denis-loginov",
      "yaroslav-demin",
      "kirill-vinogradov",
      "nikita-chernov",
      "timur-shcherbakov",
    ],
  },
  {
    key: "THEATER_STUDIO",
    name: "Театральная студия",
    subjectName: "Театр",
    lessonsPerWeek: 2,
    durationInMinutes: 60,
    breakDuration: 0,
    studentKeys: [
      "anna-vinogradova",
      "veronika-danilova",
      "sofia-morozova",
      "alina-kravtsova",
      "kirill-vinogradov",
      "olesya-safonova",
      "anastasia-markova",
    ],
  },
  {
    key: "COOKING_WORKSHOP",
    name: "Кулинарная мастерская",
    subjectName: "Кулинария",
    lessonsPerWeek: 1,
    durationInMinutes: 90,
    breakDuration: 0,
    studentKeys: [
      "sofia-morozova",
      "lada-kulikova",
      "polina-zimina",
      "margarita-egorova",
      "anastasia-markova",
    ],
  },
  {
    key: "YOGA_CLUB",
    name: "Йога после уроков",
    subjectName: "Йога",
    lessonsPerWeek: 1,
    durationInMinutes: 45,
    breakDuration: 0,
    studentKeys: [
      "eva-fomina",
      "vera-larina",
      "taisiya-lapina",
      "alisa-burova",
      "grigoriy-samoylov",
    ],
  },
];

const MOTHER_FIRST_NAMES = [
  "Елена", "Анна", "Ольга", "Наталья", "Марина", "Ирина", "Светлана", "Дарья", "Татьяна", "Юлия",
  "Виктория", "Ксения", "Анастасия", "Екатерина", "Алёна", "Лариса", "Полина", "Вера", "Лилия", "Софья",
];

const FATHER_FIRST_NAMES = [
  "Алексей", "Дмитрий", "Сергей", "Павел", "Игорь", "Виталий", "Роман", "Михаил", "Антон", "Евгений",
  "Константин", "Андрей", "Виктор", "Олег", "Николай", "Юрий", "Степан", "Илья", "Григорий", "Артём",
];

const PATRONYMICS = [
  "Андреевна", "Сергеевна", "Павловна", "Игоревна", "Викторовна", "Михайловна", "Олеговна", "Алексеевна",
  "Дмитриевна", "Юрьевна", "Андреевич", "Сергеевич", "Павлович", "Игоревич", "Викторович", "Михайлович",
  "Олегович", "Алексеевич", "Дмитриевич", "Юрьевич",
];

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function dateAtMinutes(baseDate: Date, minutesFromMidnight: number): Date {
  const result = new Date(baseDate);
  result.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0);
  return result;
}

function nextWeekday(base: Date, weekday: DayOfWeek): Date {
  const currentDay = base.getDay();
  const targetDay = weekday % 7;
  const delta = ((targetDay - currentDay + 7) % 7) || 7;
  const result = new Date(base);
  result.setDate(base.getDate() + delta);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getDefaultAttendanceLoadMode(name: string, type: SubjectType): AttendanceLoadMode {
  if (type === "ELECTIVE_REQUIRED") {
    return "AFTERSCHOOL_COEFFICIENT";
  }

  if (type === "REGIME") {
    if (name === "Завтрак" || name === "Обед" || name === "Полдник") {
      return "FULL_CLASS_SIZE";
    }

    return "AFTERSCHOOL_COEFFICIENT";
  }

  return "DELIVERY_GROUP_SIZE";
}

function surnameForGender(surnameMale: string, gender: Gender): string {
  if (gender === "MALE") {
    return surnameMale;
  }

  if (surnameMale.endsWith("ский")) {
    return `${surnameMale.slice(0, -4)}ская`;
  }

  if (surnameMale.endsWith("цкий")) {
    return `${surnameMale.slice(0, -4)}цкая`;
  }

  if (surnameMale.endsWith("ёв")) {
    return `${surnameMale}а`;
  }

  if (surnameMale.endsWith("ов") || surnameMale.endsWith("ев") || surnameMale.endsWith("ин") || surnameMale.endsWith("ын")) {
    return `${surnameMale}а`;
  }

  return `${surnameMale}а`;
}

function uniqueFamilyKeys(students: StudentSeed[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const student of students) {
    if (!seen.has(student.familyKey)) {
      seen.add(student.familyKey);
      ordered.push(student.familyKey);
    }
  }

  return ordered;
}

function addRequirement(
  target: RequirementSeed[],
  groupKey: string,
  subjectName: string,
  lessonsPerWeek: number,
  durationInMinutes: number,
  breakDuration: number,
): void {
  target.push({
    groupKey,
    subjectName,
    lessonsPerWeek,
    durationInMinutes,
    breakDuration,
  });
}

function primaryRegime(classKey: string, walkLessonsPerWeek: number): RequirementSeed[] {
  return [
    { groupKey: classKey, subjectName: "Завтрак", lessonsPerWeek: 5, durationInMinutes: 20, breakDuration: 0 },
    { groupKey: classKey, subjectName: "Обед", lessonsPerWeek: 5, durationInMinutes: 30, breakDuration: 0 },
    { groupKey: classKey, subjectName: "Полдник", lessonsPerWeek: 5, durationInMinutes: 15, breakDuration: 0 },
    { groupKey: classKey, subjectName: "Прогулка", lessonsPerWeek: walkLessonsPerWeek, durationInMinutes: 45, breakDuration: 0 },
  ];
}

function buildRequirementSeeds(): RequirementSeed[] {
  const requirements: RequirementSeed[] = [];

  for (const entry of primaryRegime("2A", 5)) requirements.push(entry);
  addRequirement(requirements, "2A", "Математика", 4, 40, 10);
  addRequirement(requirements, "2A", "Русский язык", 5, 40, 10);
  addRequirement(requirements, "2A", "Литература", 3, 40, 10);
  addRequirement(requirements, "2A", "Окружающий мир", 2, 40, 10);
  addRequirement(requirements, "2A", "Каллиграфия", 1, 40, 10);
  addRequirement(requirements, "2A", "Физическая культура", 2, 40, 10);
  addRequirement(requirements, "2A", "Музыка", 1, 40, 10);
  addRequirement(requirements, "2A", "ИЗО", 1, 40, 10);
  addRequirement(requirements, "2A_ENG_1", "Английский язык", 2, 40, 10);
  addRequirement(requirements, "2A_ENG_2", "Английский язык", 2, 40, 10);
  addRequirement(requirements, "2A", "Эксперименты", 1, 40, 10);
  addRequirement(requirements, "2A", "Хореография", 1, 40, 10);

  for (const entry of primaryRegime("2B", 5)) requirements.push(entry);
  addRequirement(requirements, "2B", "Математика", 4, 40, 10);
  addRequirement(requirements, "2B", "Русский язык", 5, 40, 10);
  addRequirement(requirements, "2B", "Литература", 3, 40, 10);
  addRequirement(requirements, "2B", "Окружающий мир", 2, 40, 10);
  addRequirement(requirements, "2B", "Каллиграфия", 1, 40, 10);
  addRequirement(requirements, "2B", "Физическая культура", 2, 40, 10);
  addRequirement(requirements, "2B", "Музыка", 1, 40, 10);
  addRequirement(requirements, "2B", "ИЗО", 1, 40, 10);
  addRequirement(requirements, "2B", "Английский язык", 2, 40, 10);
  addRequirement(requirements, "2B", "Эксперименты", 1, 40, 10);
  addRequirement(requirements, "2B", "Архитектура", 1, 40, 10);

  for (const entry of primaryRegime("3A", 5)) requirements.push(entry);
  addRequirement(requirements, "3A", "Математика", 5, 45, 10);
  addRequirement(requirements, "3A", "Русский язык", 5, 45, 10);
  addRequirement(requirements, "3A", "Литература", 3, 45, 10);
  addRequirement(requirements, "3A", "Окружающий мир", 2, 45, 10);
  addRequirement(requirements, "3A", "Физическая культура", 3, 45, 10);
  addRequirement(requirements, "3A", "Музыка", 1, 45, 10);
  addRequirement(requirements, "3A", "ИЗО", 1, 45, 10);
  addRequirement(requirements, "3A_ENG_1", "Английский язык", 2, 45, 10);
  addRequirement(requirements, "3A_ENG_2", "Английский язык", 2, 45, 10);
  addRequirement(requirements, "3A", "Эксперименты", 1, 45, 10);
  addRequirement(requirements, "3A", "Архитектура", 1, 45, 10);
  addRequirement(requirements, "3A", "Хореография", 1, 45, 10);

  for (const entry of primaryRegime("5A", 3)) requirements.push(entry);
  addRequirement(requirements, "5A", "Математика", 5, 45, 10);
  addRequirement(requirements, "5A", "Русский язык", 4, 45, 10);
  addRequirement(requirements, "5A", "Литература", 3, 45, 10);
  addRequirement(requirements, "5A", "История", 2, 45, 10);
  addRequirement(requirements, "5A", "География", 1, 45, 10);
  addRequirement(requirements, "5A", "Биология", 1, 45, 10);
  addRequirement(requirements, "5A", "Информатика", 1, 45, 10);
  addRequirement(requirements, "5A", "Физическая культура", 2, 45, 10);
  addRequirement(requirements, "5A", "Музыка", 1, 45, 10);
  addRequirement(requirements, "5A", "ИЗО", 1, 45, 10);
  addRequirement(requirements, "5A_ENG_1", "Английский язык", 3, 45, 10);
  addRequirement(requirements, "5A_ENG_2", "Английский язык", 3, 45, 10);
  addRequirement(requirements, "5A", "Эксперименты", 1, 45, 10);
  addRequirement(requirements, "5A", "Архитектура", 1, 90, 15);

  for (const entry of primaryRegime("6A", 3)) requirements.push(entry);
  addRequirement(requirements, "6A", "Математика", 5, 45, 10);
  addRequirement(requirements, "6A", "Русский язык", 4, 45, 10);
  addRequirement(requirements, "6A", "Литература", 3, 45, 10);
  addRequirement(requirements, "6A", "История", 2, 45, 10);
  addRequirement(requirements, "6A", "География", 2, 45, 10);
  addRequirement(requirements, "6A", "Биология", 2, 45, 10);
  addRequirement(requirements, "6A", "Информатика", 1, 45, 10);
  addRequirement(requirements, "6A", "Физическая культура", 2, 45, 10);
  addRequirement(requirements, "6A", "Музыка", 1, 45, 10);
  addRequirement(requirements, "6A", "ИЗО", 1, 45, 10);
  addRequirement(requirements, "6A", "Английский язык", 3, 45, 10);
  addRequirement(requirements, "6A", "Эксперименты", 1, 45, 10);
  addRequirement(requirements, "6A", "Архитектура", 1, 90, 15);

  for (const elective of ELECTIVE_GROUPS) {
    addRequirement(
      requirements,
      elective.key,
      elective.subjectName,
      elective.lessonsPerWeek,
      elective.durationInMinutes,
      elective.breakDuration,
    );
  }

  return requirements;
}

async function createCredentialAccount(userId: string, password: string): Promise<void> {
  await prisma.account.create({
    data: {
      userId,
      accountId: userId,
      providerId: "credential",
      password: await hashPassword(password),
    },
  });
}

async function clearData(): Promise<void> {
  await prisma.scheduleEntryCoveredClass.deleteMany();
  await prisma.scheduleEntry.deleteMany();
  await prisma.weeklyTemplateCoveredClass.deleteMany();
  await prisma.weeklyTemplateOpenClass.deleteMany();
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

async function main(): Promise<void> {
  console.log("Clearing existing data...");
  await clearData();

  console.log("Creating admin user...");
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

  console.log("Creating subjects...");
  const subjectIdByName = new Map<string, string>();
  for (const subject of SUBJECTS) {
    const created = await prisma.subject.create({
      data: {
        name: subject.name,
        type: subject.type,
        defaultAttendanceLoadMode: getDefaultAttendanceLoadMode(subject.name, subject.type),
      },
    });
    subjectIdByName.set(subject.name, created.id);
  }

  console.log("Creating buildings and rooms...");
  const buildingIdByKey = new Map<string, string>();
  for (const building of BUILDINGS) {
    const created = await prisma.building.create({
      data: {
        name: building.name,
        address: building.address,
      },
    });
    buildingIdByKey.set(building.key, created.id);
  }

  const roomIdByKey = new Map<string, string>();
  for (const room of ROOMS) {
    const created = await prisma.room.create({
      data: {
        name: room.name,
        seatsCount: room.seatsCount,
        buildingId: buildingIdByKey.get(room.buildingKey),
      },
    });
    roomIdByKey.set(room.key, created.id);
  }

  console.log("Creating teachers...");
  const teacherIdByKey = new Map<string, string>();
  let teacherEmailCounter = 1;

  for (const teacher of TEACHERS) {
    const user = await prisma.user.create({
      data: {
        email: `teacher${teacherEmailCounter}@classflow.local`,
        role: "USER",
        status: "ACTIVE",
        name: teacher.firstName,
        surname: teacher.lastName,
        patronymicName: teacher.patronymic,
      },
    });
    await createCredentialAccount(user.id, "teacher1234");

    const createdTeacher = await prisma.teacher.create({
      data: {
        userId: user.id,
      },
    });
    teacherIdByKey.set(teacher.key, createdTeacher.id);
    teacherEmailCounter += 1;
  }

  await prisma.teacherSubject.createMany({
    data: TEACHERS.flatMap((teacher) =>
      teacher.capabilities.map((capability) => ({
        teacherId: teacherIdByKey.get(teacher.key)!,
        subjectId: subjectIdByName.get(capability.subjectName)!,
        minGrade: capability.minGrade,
        maxGrade: capability.maxGrade,
      })),
    ),
  });

  await prisma.teacherAvailability.createMany({
    data: TEACHERS.flatMap((teacher) =>
      teacher.availability.map((slot) => ({
        teacherId: teacherIdByKey.get(teacher.key)!,
        dayOfWeek: slot.dayOfWeek,
        startTime: toMinutes(slot.start),
        endTime: toMinutes(slot.end),
        type: slot.type ?? "AVAILABLE",
      })),
    ),
  });

  console.log("Creating groups...");
  const groupIdByKey = new Map<string, string>();

  for (const schoolClass of CLASSES) {
    const created = await prisma.group.create({
      data: {
        name: schoolClass.name,
        type: "CLASS",
        grade: schoolClass.grade,
      },
    });
    groupIdByKey.set(schoolClass.key, created.id);
  }

  for (const subgroup of SUBGROUPS) {
    const created = await prisma.group.create({
      data: {
        name: subgroup.name,
        type: "SUBJECT_SUBGROUP",
        grade: CLASSES.find((entry) => entry.key === subgroup.classKey)?.grade ?? null,
        parentId: groupIdByKey.get(subgroup.classKey),
        subjectId: subjectIdByName.get(subgroup.subjectName),
      },
    });
    groupIdByKey.set(subgroup.key, created.id);
  }

  for (const elective of ELECTIVE_GROUPS) {
    const created = await prisma.group.create({
      data: {
        name: elective.name,
        type: "ELECTIVE_GROUP",
        grade: null,
        subjectId: subjectIdByName.get(elective.subjectName),
      },
    });
    groupIdByKey.set(elective.key, created.id);
  }

  console.log("Creating students...");
  const studentIdByKey = new Map<string, string>();
  const familyStudents = new Map<string, StudentSeed[]>();
  let studentEmailCounter = 1;

  for (const student of STUDENTS) {
    const surname = surnameForGender(student.surnameMale, student.gender);
    const userStatus: UserStatus = student.portalAccess ? "ACTIVE" : "PENDING_INVITE";
    const user = await prisma.user.create({
      data: {
        email: `student${studentEmailCounter}@classflow.local`,
        role: "USER",
        status: userStatus,
        name: student.firstName,
        surname,
      },
    });

    if (student.portalAccess) {
      await createCredentialAccount(user.id, "student1234");
    }

    const createdStudent = await prisma.student.create({
      data: {
        userId: user.id,
      },
    });

    studentIdByKey.set(student.key, createdStudent.id);
    studentEmailCounter += 1;

    const siblings = familyStudents.get(student.familyKey) ?? [];
    siblings.push(student);
    familyStudents.set(student.familyKey, siblings);
  }

  const studentGroupLinks = STUDENTS.map((student) => ({
    studentId: studentIdByKey.get(student.key)!,
    groupId: groupIdByKey.get(student.classKey)!,
  }));

  for (const subgroup of SUBGROUPS) {
    for (const studentKey of subgroup.studentKeys) {
      studentGroupLinks.push({
        studentId: studentIdByKey.get(studentKey)!,
        groupId: groupIdByKey.get(subgroup.key)!,
      });
    }
  }

  for (const elective of ELECTIVE_GROUPS) {
    for (const studentKey of elective.studentKeys) {
      studentGroupLinks.push({
        studentId: studentIdByKey.get(studentKey)!,
        groupId: groupIdByKey.get(elective.key)!,
      });
    }
  }

  await prisma.studentGroups.createMany({ data: studentGroupLinks });

  console.log("Creating parents and family links...");
  const familyOrder = uniqueFamilyKeys(STUDENTS);
  let parentEmailCounter = 1;

  for (let index = 0; index < familyOrder.length; index += 1) {
    const familyKey = familyOrder[index];
    const children = familyStudents.get(familyKey);

    if (!children || children.length === 0) {
      continue;
    }

    const familySurnameMale = children[0].surnameMale;
    const motherName = MOTHER_FIRST_NAMES[index % MOTHER_FIRST_NAMES.length];
    const fatherName = FATHER_FIRST_NAMES[index % FATHER_FIRST_NAMES.length];
    const motherPatronymic = PATRONYMICS[index % 10];
    const fatherPatronymic = PATRONYMICS[10 + (index % 10)];
    const hasSecondParent = index % 4 !== 0;
    const primaryParentActive = index < 8 || index % 3 === 0;
    const primarySurname = surnameForGender(familySurnameMale, "FEMALE");
    const secondarySurname = surnameForGender(familySurnameMale, "MALE");

    const primaryUser = await prisma.user.create({
      data: {
        email: `parent${parentEmailCounter}@classflow.local`,
        role: "USER",
        status: primaryParentActive ? "ACTIVE" : "PENDING_INVITE",
        name: motherName,
        surname: primarySurname,
        patronymicName: motherPatronymic,
      },
    });

    if (primaryParentActive) {
      await createCredentialAccount(primaryUser.id, "parent1234");
    }

    const primaryParent = await prisma.parent.create({
      data: {
        userId: primaryUser.id,
      },
    });
    parentEmailCounter += 1;

    const parentIds = [primaryParent.id];

    if (hasSecondParent) {
      const secondaryUser = await prisma.user.create({
        data: {
          email: `parent${parentEmailCounter}@classflow.local`,
          role: "USER",
          status: index % 5 === 0 ? "ACTIVE" : "PENDING_INVITE",
          name: fatherName,
          surname: secondarySurname,
          patronymicName: fatherPatronymic,
        },
      });

      if (index % 5 === 0) {
        await createCredentialAccount(secondaryUser.id, "parent1234");
      }

      const secondaryParent = await prisma.parent.create({
        data: {
          userId: secondaryUser.id,
        },
      });
      parentIds.push(secondaryParent.id);
      parentEmailCounter += 1;
    }

    await prisma.studentParents.createMany({
      data: parentIds.flatMap((parentId) =>
        children.map((child) => ({
          parentId,
          studentId: studentIdByKey.get(child.key)!,
        })),
      ),
    });
  }

  console.log("Creating room compatibilities...");
  await prisma.roomSubject.createMany({
    data: ROOMS.flatMap((room) =>
      room.subjectNames.map((subjectName) => ({
        roomId: roomIdByKey.get(room.key)!,
        subjectId: subjectIdByName.get(subjectName)!,
      })),
    ),
  });

  console.log("Creating lesson requirements...");
  const requirementSeeds = buildRequirementSeeds();
  await prisma.groupSubjectRequirement.createMany({
    data: requirementSeeds.map((requirement) => ({
      groupId: groupIdByKey.get(requirement.groupKey)!,
      subjectId: subjectIdByName.get(requirement.subjectName)!,
      lessonsPerWeek: requirement.lessonsPerWeek,
      durationInMinutes: requirement.durationInMinutes,
      breakDuration: requirement.breakDuration,
    })),
  });

  console.log("Creating availability overrides...");
  const baseDate = new Date();
  const nextMonday = nextWeekday(baseDate, 1);
  const nextThursday = nextWeekday(baseDate, 4);

  await prisma.teacherAvailabilityOverride.createMany({
    data: [
      {
        teacherId: teacherIdByKey.get("ENGLISH_PRIMARY")!,
        type: "UNAVAILABLE",
        startTime: dateAtMinutes(nextMonday, toMinutes("09:30")),
        endTime: dateAtMinutes(nextMonday, toMinutes("12:30")),
      },
      {
        teacherId: teacherIdByKey.get("SCIENCE")!,
        type: "UNAVAILABLE",
        startTime: dateAtMinutes(nextThursday, toMinutes("10:00")),
        endTime: dateAtMinutes(nextThursday, toMinutes("13:00")),
      },
      {
        teacherId: teacherIdByKey.get("STAGE")!,
        type: "AVAILABLE",
        startTime: dateAtMinutes(nextThursday, toMinutes("15:00")),
        endTime: dateAtMinutes(nextThursday, toMinutes("18:00")),
      },
    ],
  });

  console.log("Seed completed.");
  console.log(`Teachers: ${TEACHERS.length}`);
  console.log(`Parents: ${parentEmailCounter - 1}`);
  console.log(`Students: ${STUDENTS.length}`);
  console.log(`Groups: ${CLASSES.length + SUBGROUPS.length + ELECTIVE_GROUPS.length}`);
  console.log(`Requirements: ${requirementSeeds.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
