import type { GroupType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/server-action-auth";

import {
  adminScheduleTemplateInclude,
  mapWeeklyTemplateToAdminScheduleEvents,
} from "./admin-schedule-mapper";
import type { AdminSchedulePageData } from "./admin-schedule-types";
import { getUserFullName } from "@/lib/auth-access";

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
      select: { id: true, name: true, type: true },
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
      select: { id: true, name: true, type: true, subjectId: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.room.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      select: {
        id: true,
        user: { select: { surname: true, name: true, patronymicName: true } },
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

  const lessonDurationByGroupSubject = Object.fromEntries(
    requirements.map((item) => [`${item.groupId}:${item.subjectId}`, item.durationInMinutes]),
  );

  return {
    events: templates.flatMap((entry) => mapWeeklyTemplateToAdminScheduleEvents(entry)),
    classRows,
    subjectOptions: subjects,
    directGroupOptions: groups.filter((group) => group.type === "CLASS" || group.type === "SUBJECT_SUBGROUP"),
    electiveGroupOptions: groups
      .filter((group) => group.type === "ELECTIVE_GROUP")
      .map((group) => ({
        id: group.id,
        name: group.name,
        subjectId: group.subjectId,
      })),
    roomOptions: rooms,
    teacherOptions: teachers.map((teacher) => ({
      id: teacher.id,
      name: getUserFullName(teacher.user) || "Без имени",
    })),
    lessonDurationByGroupSubject,
  };
}
