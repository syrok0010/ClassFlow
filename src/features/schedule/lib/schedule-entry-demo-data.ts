import type { Prisma } from "@/generated/prisma/client"

export const scheduleEntryDemoArgs = {
  select: {
    id: true,
    templateId: true,
    date: true,
    startTime: true,
    endTime: true,
    groupId: true,
    roomId: true,
    teacherId: true,
    subjectId: true,
    group: {
      select: {
        id: true,
        name: true,
        type: true,
        grade: true,
      },
    },
    room: {
      select: {
        id: true,
        name: true,
        seatsCount: true,
        building: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    },
    teacher: {
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            patronymicName: true,
            email: true,
          },
        },
      },
    },
    subject: {
      select: {
        id: true,
        name: true,
        type: true,
      },
    },
  },
} satisfies Prisma.ScheduleEntryDefaultArgs

export type ScheduleEntryDemoRecord = Prisma.ScheduleEntryGetPayload<
  typeof scheduleEntryDemoArgs
>

const DEMO_WEEK_START = new Date(2026, 3, 20, 0, 0, 0, 0)

export function createFallbackScheduleEntries(): ScheduleEntryDemoRecord[] {
  return [
    createEntry(0, 8, 30, 9, 20, {
      id: "demo-schedule-entry-math",
      group: {
        id: "demo-group-10a",
        name: "10 А",
        type: "CLASS",
        grade: 10,
      },
      room: {
        id: "demo-room-101",
        name: "Кабинет 101",
        seatsCount: 30,
        building: {
          id: "demo-building-main",
          name: "Главное здание",
          address: null,
        },
      },
      teacher: {
        id: "demo-teacher-1",
        userId: "demo-user-teacher-1",
        user: {
          id: "demo-user-teacher-1",
          name: "Иван",
          surname: "Иванов",
          patronymicName: "Иванович",
          email: "teacher1@classflow.local",
        },
      },
      subject: {
        id: "demo-subject-math",
        name: "Алгебра",
        type: "ACADEMIC",
      },
    }),
    createEntry(0, 9, 0, 10, 10, {
      id: "demo-schedule-entry-english",
      group: {
        id: "demo-group-10a",
        name: "10 А",
        type: "CLASS",
        grade: 10,
      },
      room: {
        id: "demo-room-102",
        name: "Кабинет 102",
        seatsCount: 30,
        building: {
          id: "demo-building-main",
          name: "Главное здание",
          address: null,
        },
      },
      teacher: {
        id: "demo-teacher-3",
        userId: "demo-user-teacher-3",
        user: {
          id: "demo-user-teacher-3",
          name: "Анна",
          surname: "Смирнова",
          patronymicName: "Ивановна",
          email: "teacher3@classflow.local",
        },
      },
      subject: {
        id: "demo-subject-english",
        name: "Английский",
        type: "ACADEMIC",
      },
    }),
    createEntry(1, 10, 20, 11, 0, {
      id: "demo-schedule-entry-lunch",
      group: {
        id: "demo-group-10a",
        name: "10 А",
        type: "CLASS",
        grade: 10,
      },
      room: {
        id: "demo-room-canteen",
        name: "Столовая",
        seatsCount: 100,
        building: {
          id: "demo-building-main",
          name: "Главное здание",
          address: null,
        },
      },
      teacher: null,
      subject: {
        id: "demo-subject-lunch",
        name: "Обед",
        type: "REGIME",
      },
    }),
    createEntry(2, 7, 45, 8, 30, {
      id: "demo-schedule-entry-breakfast",
      group: {
        id: "demo-group-10b",
        name: "10 Б",
        type: "CLASS",
        grade: 10,
      },
      room: {
        id: "demo-room-canteen",
        name: "Столовая",
        seatsCount: 100,
        building: {
          id: "demo-building-main",
          name: "Главное здание",
          address: null,
        },
      },
      teacher: null,
      subject: {
        id: "demo-subject-lunch",
        name: "Обед",
        type: "REGIME",
      },
    }),
    createEntry(2, 9, 10, 9, 55, {
      id: "demo-schedule-entry-physics-10a",
      group: {
        id: "demo-group-10a",
        name: "10 А",
        type: "CLASS",
        grade: 10,
      },
      room: {
        id: "demo-room-lab1",
        name: "Лаборатория Физики",
        seatsCount: 20,
        building: {
          id: "demo-building-main",
          name: "Главное здание",
          address: null,
        },
      },
      teacher: {
        id: "demo-teacher-1",
        userId: "demo-user-teacher-1",
        user: {
          id: "demo-user-teacher-1",
          name: "Иван",
          surname: "Иванов",
          patronymicName: "Иванович",
          email: "teacher1@classflow.local",
        },
      },
      subject: {
        id: "demo-subject-physics",
        name: "Физика",
        type: "ACADEMIC",
      },
    }),
    createEntry(2, 9, 20, 10, 5, {
      id: "demo-schedule-entry-english-10b",
      group: {
        id: "demo-group-10b",
        name: "10 Б",
        type: "CLASS",
        grade: 10,
      },
      room: {
        id: "demo-room-101",
        name: "Кабинет 101",
        seatsCount: 30,
        building: {
          id: "demo-building-main",
          name: "Главное здание",
          address: null,
        },
      },
      teacher: {
        id: "demo-teacher-3",
        userId: "demo-user-teacher-3",
        user: {
          id: "demo-user-teacher-3",
          name: "Анна",
          surname: "Смирнова",
          patronymicName: "Ивановна",
          email: "teacher3@classflow.local",
        },
      },
      subject: {
        id: "demo-subject-english",
        name: "Английский",
        type: "ACADEMIC",
      },
    }),
    createEntry(3, 16, 30, 18, 45, {
      id: "demo-schedule-entry-pe",
      group: {
        id: "demo-group-10a",
        name: "10 А",
        type: "CLASS",
        grade: 10,
      },
      room: {
        id: "demo-room-gym",
        name: "Спортивный Зал",
        seatsCount: 50,
        building: {
          id: "demo-building-sport",
          name: "Спортивный Корпус",
          address: null,
        },
      },
      teacher: {
        id: "demo-teacher-2",
        userId: "demo-user-teacher-2",
        user: {
          id: "demo-user-teacher-2",
          name: "Пётр",
          surname: "Петров",
          patronymicName: "Петрович",
          email: "teacher2@classflow.local",
        },
      },
      subject: {
        id: "demo-subject-pe",
        name: "Физкультура",
        type: "ACADEMIC",
      },
    }),
    createEntry(4, 11, 0, 12, 30, {
      id: "demo-schedule-entry-math-10b",
      group: {
        id: "demo-group-10b",
        name: "10 Б",
        type: "CLASS",
        grade: 10,
      },
      room: {
        id: "demo-room-102",
        name: "Кабинет 102",
        seatsCount: 30,
        building: {
          id: "demo-building-main",
          name: "Главное здание",
          address: null,
        },
      },
      teacher: {
        id: "demo-teacher-1",
        userId: "demo-user-teacher-1",
        user: {
          id: "demo-user-teacher-1",
          name: "Иван",
          surname: "Иванов",
          patronymicName: "Иванович",
          email: "teacher1@classflow.local",
        },
      },
      subject: {
        id: "demo-subject-math",
        name: "Алгебра",
        type: "ACADEMIC",
      },
    }),
  ]
}

function createEntry(
  dayOffset: number,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  meta: {
    id: string
    group: ScheduleEntryDemoRecord["group"]
    room: ScheduleEntryDemoRecord["room"]
    teacher: ScheduleEntryDemoRecord["teacher"]
    subject: ScheduleEntryDemoRecord["subject"]
  }
): ScheduleEntryDemoRecord {
  const startTime = createDate(dayOffset, startHour, startMinute)
  const endTime = createDate(dayOffset, endHour, endMinute)

  return {
    id: meta.id,
    templateId: null,
    date: createDate(dayOffset, 0, 0),
    startTime,
    endTime,
    groupId: meta.group.id,
    roomId: meta.room?.id ?? null,
    teacherId: meta.teacher?.id ?? null,
    subjectId: meta.subject.id,
    group: meta.group,
    room: meta.room,
    teacher: meta.teacher,
    subject: meta.subject,
  }
}

function createDate(dayOffset: number, hour: number, minute: number) {
  return new Date(
    DEMO_WEEK_START.getFullYear(),
    DEMO_WEEK_START.getMonth(),
    DEMO_WEEK_START.getDate() + dayOffset,
    hour,
    minute,
    0,
    0
  )
}
