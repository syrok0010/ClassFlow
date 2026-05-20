import { prisma } from "@/lib/prisma";

import type { FetInput } from "./types";

export async function collectFetInput(): Promise<FetInput> {
  const [
    requirements,
    teacherSubjects,
    teacherAvailabilities,
    roomSubjects,
    rooms,
    groups,
    subjects,
  ] = await Promise.all([
    prisma.groupSubjectRequirement.findMany({
      include: {
        group: {
          select: {
            id: true,
            name: true,
            type: true,
            grade: true,
            parentId: true,
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
      orderBy: [{ group: { grade: "asc" } }, { group: { name: "asc" } }, { subject: { name: "asc" } }],
    }),
    prisma.teacherSubject.findMany({
      select: {
        teacherId: true,
        subjectId: true,
        minGrade: true,
        maxGrade: true,
      },
      orderBy: [{ subjectId: "asc" }, { teacherId: "asc" }],
    }),
    prisma.teacherAvailability.findMany({
      select: {
        teacherId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        type: true,
      },
      orderBy: [{ teacherId: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.roomSubject.findMany({
      select: {
        roomId: true,
        subjectId: true,
      },
      orderBy: [{ subjectId: "asc" }, { roomId: "asc" }],
    }),
    prisma.room.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ name: "asc" }],
    }),
    prisma.group.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        grade: true,
        parentId: true,
      },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    }),
    prisma.subject.findMany({
      select: {
        id: true,
        name: true,
        type: true,
      },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  const normalizedRequirements = requirements.map((requirement) => ({
    groupId: requirement.groupId,
    subjectId: requirement.subjectId,
    lessonsPerWeek: requirement.lessonsPerWeek,
    durationInMinutes: requirement.durationInMinutes,
    breakDuration: requirement.breakDuration,
    group: requirement.group,
    subject: requirement.subject,
  }));

  return {
    requirements: normalizedRequirements,
    regimeRequirements: normalizedRequirements.filter((requirement) => requirement.subject.type === "REGIME"),
    lessonRequirements: normalizedRequirements.filter((requirement) => requirement.subject.type !== "REGIME"),
    groups,
    subjects,
    teacherSubjects,
    teacherAvailabilities,
    rooms,
    roomSubjects,
  };
}
