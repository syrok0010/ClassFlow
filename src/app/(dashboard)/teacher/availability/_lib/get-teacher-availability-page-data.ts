import { addDays } from "date-fns";
import { getUserFullName } from "@/lib/auth-access";
import { prisma } from "@/lib/prisma";
import { requireTeacherActor } from "@/lib/server-action-auth";
import type { TeacherAvailabilityPageData } from "./types";

export async function getTeacherAvailabilityPageData(
  weekStart: Date,
): Promise<TeacherAvailabilityPageData> {
  const actor = await requireTeacherActor();

  const teacher = await prisma.teacher.findUnique({
    where: { id: actor.teacherId },
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
    teacher: {
      teacherId: teacher.id,
      userId: teacher.user.id,
      fullName: getUserFullName(teacher.user) || teacher.user.email || "Без имени",
      email: teacher.user.email,
      templateEntries: teacher.teacherAvailabilities.map((entry) => ({
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        type: entry.type,
      })),
      overrides: teacher.teacherAvailabilityOverrides.map((entry) => ({
        id: entry.id,
        startTime: entry.startTime,
        endTime: entry.endTime,
        type: entry.type,
      })),
    },
  };
}
