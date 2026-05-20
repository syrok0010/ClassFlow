import type { GroupType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/server-action-auth";

import {
  adminScheduleTemplateInclude,
  mapWeeklyTemplateToAdminScheduleEvents,
} from "./admin-schedule-mapper";
import type { AdminSchedulePageData } from "./admin-schedule-types";
import { getUserFullName } from "@/lib/auth-access";
import { buildLessonDurationByGroupSubject } from "./schedule-duration-map";

const VISIBLE_CLASS_TYPES: GroupType[] = ["CLASS"];

export async function getAdminSchedulePageData(): Promise<AdminSchedulePageData> {
  await requireAdminContext();

  const classRows = await prisma.group.findMany({
    where: {
      type: {
        in: VISIBLE_CLASS_TYPES,
      },
    },
    select: {
      id: true,
      name: true,
      grade: true,
      _count: {
        select: {
          studentGroups: true,
        },
      },
    },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
  });

  if (classRows.length === 0) {
    return {
      events: [],
      classRows: [],
      subjectOptions: [],
      directGroupOptions: [],
      electiveGroupOptions: [],
      roomOptions: [],
      teacherOptions: [],
      lessonDurationByGroupSubject: {},
    };
  }

  const classIds = classRows.map((row) => row.id);

  const templates = await prisma.weeklyScheduleTemplate.findMany({
    where: {
      OR: [
        {
          deliveryGroupId: {
            in: classIds,
          },
        },
        {
          deliveryGroup: {
            parentId: {
              in: classIds,
            },
            type: "SUBJECT_SUBGROUP",
          },
        },
        {
          openClasses: {
            some: {
              classGroupId: {
                in: classIds,
              },
            },
          },
        },
        {
          coveredClasses: {
            some: {
              classGroupId: {
                in: classIds,
              },
            },
          },
        },
      ],
    },
    include: adminScheduleTemplateInclude,
    orderBy: [
      { dayOfWeek: "asc" },
      { startTime: "asc" },
      { endTime: "asc" },
      { id: "asc" },
    ],
  });

  const [subjects, groups, rooms, teachers, requirements] = await Promise.all([
    prisma.subject.findMany({
      select: { id: true, name: true, type: true, defaultAttendanceLoadMode: true },
      orderBy: { name: "asc" },
    }),
    prisma.group.findMany({
      where: {
        OR: [
          { id: { in: classIds } },
          { parentId: { in: classIds } },
          { type: "ELECTIVE_GROUP" },
        ],
      },
      select: {
        id: true,
        name: true,
        type: true,
        subjectId: true,
        parentId: true,
        grade: true,
        _count: {
          select: {
            studentGroups: true,
          },
        },
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.room.findMany({
      select: {
        id: true,
        name: true,
        seatsCount: true,
        roomSubjects: {
          select: {
            subjectId: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      select: {
        id: true,
        user: { select: { surname: true, name: true, patronymicName: true } },
        teacherSubjects: {
          select: {
            subjectId: true,
            minGrade: true,
            maxGrade: true,
          },
        },
      },
      orderBy: { user: { surname: "asc" } },
    }),
    prisma.groupSubjectRequirement.findMany({
      where: {
        group: {
          OR: [
            {
              id: {
                in: classIds,
              },
            },
            {
              parentId: {
                in: classIds,
              },
              type: "SUBJECT_SUBGROUP",
            },
            {
              type: "ELECTIVE_GROUP",
            },
          ],
        },
      },
      select: {
        groupId: true,
        subjectId: true,
        durationInMinutes: true,
      },
    }),
  ]);

  const lessonDurationByGroupSubject = buildLessonDurationByGroupSubject(requirements, templates);
  const subjectIdsByGroup = new Map<string, string[]>();
  for (const requirement of requirements) {
    const current = subjectIdsByGroup.get(requirement.groupId) ?? [];
    current.push(requirement.subjectId);
    subjectIdsByGroup.set(requirement.groupId, current);
  }

  for (const template of templates) {
    const subjectGroupIds = template.deliveryMode === "SHARED_CLASSES"
      ? template.coveredClasses.map((coveredClass) => coveredClass.classGroupId)
      : template.deliveryGroupId
        ? [template.deliveryGroupId]
        : [];

    for (const groupId of subjectGroupIds) {
      const current = subjectIdsByGroup.get(groupId) ?? [];
      current.push(template.subjectId);
      subjectIdsByGroup.set(groupId, current);
    }
  }
  const classSubjectIdsById = new Map(
    classRows.map((row) => [row.id, [...new Set(subjectIdsByGroup.get(row.id) ?? [])].sort()]),
  );

  return {
    events: templates.flatMap((entry) => mapWeeklyTemplateToAdminScheduleEvents(entry)),
    classRows: classRows.map((row) => ({
      id: row.id,
      name: row.name,
      grade: row.grade,
      studentCount: row._count.studentGroups,
      subjectIds: classSubjectIdsById.get(row.id) ?? [],
    })),
    subjectOptions: subjects,
    directGroupOptions: groups
      .filter((group) => group.type === "CLASS" || group.type === "SUBJECT_SUBGROUP")
      .map((group) => ({
        id: group.id,
        name: group.name,
        type: group.type,
        subjectId: group.subjectId,
        parentId: group.parentId ?? null,
        grade: group.grade ?? null,
        studentCount: group._count.studentGroups,
        subjectIds: [...new Set(subjectIdsByGroup.get(group.id) ?? [])].sort(),
      })),
    electiveGroupOptions: groups
      .filter((group) => group.type === "ELECTIVE_GROUP")
      .map((group) => ({
        id: group.id,
        name: group.name,
        subjectId: group.subjectId,
        studentCount: group._count.studentGroups,
        subjectIds: [...new Set(subjectIdsByGroup.get(group.id) ?? (group.subjectId ? [group.subjectId] : []))].sort(),
      })),
    roomOptions: rooms.map((room) => ({
      id: room.id,
      name: room.name,
      seatsCount: room.seatsCount,
      subjectIds: [...new Set(room.roomSubjects.map((item) => item.subjectId))].sort(),
    })),
    teacherOptions: teachers.map((teacher) => ({
      id: teacher.id,
      name: getUserFullName(teacher.user) || "Без имени",
      subjects: teacher.teacherSubjects.map((subject) => ({
        subjectId: subject.subjectId,
        minGrade: subject.minGrade,
        maxGrade: subject.maxGrade,
      })),
    })),
    lessonDurationByGroupSubject,
  };
}
