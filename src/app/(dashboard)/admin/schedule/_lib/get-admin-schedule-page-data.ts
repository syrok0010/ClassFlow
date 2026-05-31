import type { GroupType } from "@/generated/prisma/enums";
import { getUserFullName } from "@/lib/auth-access";
import { prisma } from "@/lib/prisma";
import { requireAdminContext } from "@/lib/server-action-auth";

import {
  adminScheduleTemplateInclude,
  type RequirementMeta,
  mapWeeklyTemplateToAdminScheduleEvents,
} from "./admin-schedule-mapper";
import type { AdminSchedulePageData } from "./admin-schedule-types";
import { buildLessonDurationByGroupSubject } from "./schedule-duration-map";
import { getScheduleBreakValidationEnabled } from "./schedule-validation-env";

const VISIBLE_CLASS_TYPES: GroupType[] = ["CLASS"];

export type AdminScheduleEditorData = Pick<
  AdminSchedulePageData,
  | "classRows"
  | "subjectOptions"
  | "directGroupOptions"
  | "electiveGroupOptions"
  | "roomOptions"
  | "teacherOptions"
  | "lessonDurationByGroupSubject"
>;

type ScheduleDurationTemplateRecord = Parameters<typeof buildLessonDurationByGroupSubject>[1][number];

export async function getAdminScheduleEditorData(): Promise<AdminScheduleEditorData> {
  await requireAdminContext();

  const classRows = await loadVisibleClassRows();

  if (classRows.length === 0) {
    return buildAdminScheduleEditorData(
      {
        classRows,
        subjects: [],
        groups: [],
        rooms: [],
        teachers: [],
        requirements: [],
      },
      [],
    );
  }

  const classIds = classRows.map((row) => row.id);
  const [sourceData, durationTemplates] = await Promise.all([
    loadAdminScheduleEditorSourceData(classIds),
    loadScheduleDurationTemplates(classIds),
  ]);

  return buildAdminScheduleEditorData(
    {
      classRows,
      ...sourceData,
    },
    durationTemplates,
  );
}

export async function getAdminSchedulePageData(): Promise<AdminSchedulePageData> {
  await requireAdminContext();

  const classRows = await loadVisibleClassRows();

  if (classRows.length === 0) {
    return {
      events: [],
      scheduleConflictOptions: {
        validateBreakDuration: getScheduleBreakValidationEnabled(),
      },
      ...buildAdminScheduleEditorData(
        {
          classRows,
          subjects: [],
          groups: [],
          rooms: [],
          teachers: [],
          requirements: [],
        },
        [],
      ),
    };
  }

  const classIds = classRows.map((row) => row.id);
  const [templates, sourceData] = await Promise.all([
    prisma.weeklyScheduleTemplate.findMany({
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
    }),
    loadAdminScheduleEditorSourceData(classIds),
  ]);
  const editorData = buildAdminScheduleEditorData(
    {
      classRows,
      ...sourceData,
    },
    templates,
  );
  const requirementMetaByGroupSubject: Record<string, RequirementMeta> = Object.fromEntries(
    sourceData.requirements.map((requirement) => [
      `${requirement.groupId}:${requirement.subjectId}`,
      {
        lessonsPerWeek: requirement.lessonsPerWeek,
        breakDuration: requirement.breakDuration,
      },
    ]),
  );

  return {
    events: templates.flatMap((entry) =>
      mapWeeklyTemplateToAdminScheduleEvents(entry, requirementMetaByGroupSubject)
    ),
    scheduleConflictOptions: {
      validateBreakDuration: getScheduleBreakValidationEnabled(),
    },
    ...editorData,
  };
}

function loadVisibleClassRows() {
  return prisma.group.findMany({
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
}

function loadScheduleDurationTemplates(classIds: string[]) {
  return prisma.weeklyScheduleTemplate.findMany({
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
    select: {
      subjectId: true,
      deliveryGroupId: true,
      startTime: true,
      endTime: true,
      deliveryGroup: {
        select: {
          type: true,
          parentId: true,
        },
      },
      coveredClasses: {
        select: {
          classGroupId: true,
        },
      },
    },
  });
}

async function loadAdminScheduleEditorSourceData(classIds: string[]) {
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
        lessonsPerWeek: true,
        breakDuration: true,
      },
    }),
  ]);

  return {
    subjects,
    groups,
    rooms,
    teachers,
    requirements,
  };
}

function buildAdminScheduleEditorData(
  {
    classRows,
    subjects,
    groups,
    rooms,
    teachers,
    requirements,
  }: Awaited<ReturnType<typeof loadAdminScheduleEditorSourceData>> & {
    classRows: Awaited<ReturnType<typeof loadVisibleClassRows>>;
  },
  durationTemplates: ScheduleDurationTemplateRecord[],
): AdminScheduleEditorData {
  const lessonDurationByGroupSubject = buildLessonDurationByGroupSubject(requirements, durationTemplates);
  const subjectIdsByGroup = new Map<string, string[]>();
  for (const requirement of requirements) {
    const current = subjectIdsByGroup.get(requirement.groupId) ?? [];
    current.push(requirement.subjectId);
    subjectIdsByGroup.set(requirement.groupId, current);
  }

  for (const template of durationTemplates) {
    for (const groupId of getTemplateSubjectGroupIds(template)) {
      const current = subjectIdsByGroup.get(groupId) ?? [];
      current.push(template.subjectId);
      subjectIdsByGroup.set(groupId, current);
    }
  }
  const classSubjectIdsById = new Map(
    classRows.map((row) => [row.id, [...new Set(subjectIdsByGroup.get(row.id) ?? [])].sort()]),
  );

  return {
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

function getTemplateSubjectGroupIds(template: ScheduleDurationTemplateRecord) {
  if (template.coveredClasses.length > 0) {
    return template.coveredClasses.map((coveredClass) => coveredClass.classGroupId);
  }

  return template.deliveryGroupId ? [template.deliveryGroupId] : [];
}
