import { prisma } from "@/lib/prisma";
import { getUserFullName } from "@/lib/auth-access";

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
    electiveStudentMemberships,
    teachers,
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
            _count: { select: { studentGroups: true } },
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            type: true,
            defaultAttendanceLoadMode: true,
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
        seatsCount: true,
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
        _count: { select: { studentGroups: true } },
      },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    }),
    prisma.subject.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        defaultAttendanceLoadMode: true,
      },
      orderBy: [{ name: "asc" }],
    }),
    prisma.studentGroups.findMany({
      where: {
        group: { type: "ELECTIVE_GROUP" },
      },
      select: {
        groupId: true,
        student: {
          select: {
            studentGroups: {
              where: { group: { type: "CLASS" } },
              select: { groupId: true },
            },
          },
        },
      },
    }),
    prisma.teacher.findMany({
      select: {
        id: true,
        user: { select: { surname: true, name: true, patronymicName: true } },
      },
    }),
  ]);

  const normalizedRequirements = requirements.map((requirement) => ({
    groupId: requirement.groupId,
    subjectId: requirement.subjectId,
    lessonsPerWeek: requirement.lessonsPerWeek,
    durationInMinutes: requirement.durationInMinutes,
    breakDuration: requirement.breakDuration,
    group: {
      id: requirement.group.id,
      name: requirement.group.name,
      type: requirement.group.type,
      grade: requirement.group.grade,
      parentId: requirement.group.parentId,
      studentCount: requirement.group._count.studentGroups,
    },
    subject: requirement.subject,
  }));

  return {
    requirements: normalizedRequirements,
    regimeRequirements: normalizedRequirements.filter((requirement) => requirement.subject.type === "REGIME"),
    lessonRequirements: normalizedRequirements.filter((requirement) => requirement.subject.type !== "REGIME"),
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      type: group.type,
      grade: group.grade,
      parentId: group.parentId,
      studentCount: group._count.studentGroups,
    })),
    subjects,
    teacherSubjects,
    teacherAvailabilities,
    teacherNamesById: Object.fromEntries(
      teachers.map((teacher) => [teacher.id, getUserFullName(teacher.user) || teacher.id]),
    ),
    rooms,
    roomSubjects,
    electiveGroupOpenClassIdsByGroupId: buildElectiveOpenClassMap(electiveStudentMemberships),
  };
}

function buildElectiveOpenClassMap(
  memberships: Array<{
    groupId: string;
    student: {
      studentGroups: Array<{ groupId: string }>;
    };
  }>,
) {
  const classIdsByElectiveGroupId = new Map<string, Set<string>>();

  for (const membership of memberships) {
    const classIds = classIdsByElectiveGroupId.get(membership.groupId) ?? new Set<string>();

    for (const classMembership of membership.student.studentGroups) {
      classIds.add(classMembership.groupId);
    }

    classIdsByElectiveGroupId.set(membership.groupId, classIds);
  }

  return Object.fromEntries(
    Array.from(classIdsByElectiveGroupId.entries()).map(([groupId, classIds]) => [
      groupId,
      Array.from(classIds).sort(),
    ]),
  );
}
