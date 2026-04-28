import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { AvailabilityTeacher, AvailabilityWeekData } from "./types";
import { mapTeacherToAvailabilityTeacher, mapTeachersToAvailabilityTeachers } from "./mappers";

export async function getAdminAvailabilityWeekData(
  weekStart: Date,
): Promise<AvailabilityWeekData> {
  const teachers = await prisma.teacher.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          surname: true,
          name: true,
          patronymicName: true,
        },
      },
      teacherAvailabilities: {
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          type: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      teacherAvailabilityOverrides: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          type: true,
        },
        orderBy: [{ startTime: "asc" }],
      },
    },
    orderBy: [{ user: { surname: "asc" } }, { user: { name: "asc" } }],
  });

  return {
    weekStart,
    weekEnd: addDays(weekStart, 7),
    teachers: mapTeachersToAvailabilityTeachers(teachers),
  };
}

export async function getTeacherAvailabilityPageData(
  weekStart: Date,
  teacherId: string,
): Promise<{
  weekStart: Date;
  weekEnd: Date;
  teacher: AvailabilityTeacher;
}> {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          surname: true,
          name: true,
          patronymicName: true,
        },
      },
      teacherAvailabilities: {
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          type: true,
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      teacherAvailabilityOverrides: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          type: true,
        },
        orderBy: [{ startTime: "asc" }],
      },
    },
  });

  if (!teacher) {
    throw new Error("Профиль преподавателя не найден");
  }

  return {
    weekStart,
    weekEnd: addDays(weekStart, 7),
    teacher: mapTeacherToAvailabilityTeacher(teacher),
  };
}
