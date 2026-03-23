"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import type { GroupType } from "@/generated/prisma/client";
import {
  assignStudentsSchema,
  createGroupSchema,
  groupTypeSchema,
  idSchema,
  splitSchema,
  updateGroupSchema,
} from "../_lib/group-schemas";
import type {
  GroupWithDetails,
  StudentForAssignment,
  SubjectOption,
} from "../_lib/types";

type GroupsTreeFilters = {
  search?: string;
  type?: GroupType;
};

function filterGroupsTree(
  groups: GroupWithDetails[],
  filters: GroupsTreeFilters
): GroupWithDetails[] {
  const search = filters.search?.trim().toLowerCase();

  const filterNodeBySearch = (node: GroupWithDetails): GroupWithDetails | null => {
    const filteredSubGroups = node.subGroups
      .map(filterNodeBySearch)
      .filter((group): group is GroupWithDetails => group !== null);

    const matchesSearch =
      !search ||
      node.name.toLowerCase().includes(search) ||
      filteredSubGroups.length > 0;

    if (!matchesSearch) {
      return null;
    }

    return {
      ...node,
      subGroups: filteredSubGroups,
    };
  };

  return groups
    .map(filterNodeBySearch)
    .filter((group): group is GroupWithDetails => group !== null)
    .filter((group) => !filters.type || group.type === filters.type);
}

export async function getGroupsTree(
  filters: GroupsTreeFilters = {}
): Promise<GroupWithDetails[]> {
  const groups = await prisma.group.findMany({
    include: {
      subject: { select: { id: true, name: true } },
      _count: { select: { studentGroups: true } },
    },
    orderBy: [{ type: "asc" }, { grade: "asc" }, { name: "asc" }],
  });

  type FlatGroup = (typeof groups)[number];

  const groupsByParentId = new Map<string | null, FlatGroup[]>();

  for (const group of groups) {
    const key = group.parentId;
    const existing = groupsByParentId.get(key);

    if (existing) {
      existing.push(group);
      continue;
    }

    groupsByParentId.set(key, [group]);
  }

  const buildTreeNode = (group: FlatGroup): GroupWithDetails => ({
    id: group.id,
    name: group.name,
    type: group.type,
    grade: group.grade,
    parentId: group.parentId,
    subjectId: group.subjectId,
    subject: group.subject,
    _count: { studentGroups: group._count.studentGroups },
    subGroups: (groupsByParentId.get(group.id) ?? []).map(buildTreeNode),
  });

  const rootGroups = (groupsByParentId.get(null) ?? []).map(buildTreeNode);

  return filterGroupsTree(rootGroups, filters);
}

export async function createGroupAction(data: {
  name: string;
  type: string;
  grade?: number | null;
  parentId?: string | null;
  subjectId?: string | null;
}) {
  const validated = createGroupSchema.parse(data);

  const group = await prisma.group.create({
    data: {
      name: validated.name,
      type: validated.type,
      grade: validated.grade ?? null,
      parentId: validated.parentId ?? null,
      subjectId: validated.subjectId ?? null,
    },
  });

  revalidatePath("/admin/groups");
  return group;
}

export async function updateGroupAction(
  id: string,
  data: { name?: string; type?: string; grade?: number | null }
) {
  idSchema.parse(id);
  const validated = updateGroupSchema.parse(data);

  const group = await prisma.group.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/admin/groups");
  return group;
}

async function collectGroupIds(rootId: string): Promise<string[]> {
  const root = await prisma.group.findUnique({
    where: { id: rootId },
    select: { id: true },
  });

  if (!root) {
    return [];
  }

  const visitedIds = new Set<string>([root.id]);
  const orderedIds = [root.id];
  let frontier = [root.id];

  while (frontier.length > 0) {
    const children = await prisma.group.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });

    frontier = [];

    for (const child of children) {
      if (visitedIds.has(child.id)) {
        continue;
      }

      visitedIds.add(child.id);
      orderedIds.push(child.id);
      frontier.push(child.id);
    }
  }

  return orderedIds;
}

export async function deleteGroupAction(id: string) {
  idSchema.parse(id);

  const allGroupIds = await collectGroupIds(id);

  if (allGroupIds.length === 0) {
    throw new Error("Группа не найдена");
  }

  await prisma.$transaction([
    prisma.studentGroups.deleteMany({
      where: { groupId: { in: allGroupIds } },
    }),
    prisma.groupSubjectRequirement.deleteMany({
      where: { groupId: { in: allGroupIds } },
    }),
    ...allGroupIds
      .slice()
      .reverse()
      .map((gid) =>
        prisma.group.delete({ where: { id: gid } })
      ),
  ]);

  revalidatePath("/admin/groups");
}


export async function getStudentsForAssignment(
  groupId: string,
  groupType: string
): Promise<{
  assigned: StudentForAssignment[];
  available: StudentForAssignment[];
}> {
  idSchema.parse(groupId);
  groupTypeSchema.parse(groupType);

  const assignedStudentIds = await prisma.studentGroups.findMany({
    where: { groupId },
    select: { studentId: true },
  });
  const assignedIds = new Set(assignedStudentIds.map((s) => s.studentId));

  let availableWhere: Record<string, unknown> = {};

  if (groupType === "CLASS") {
    const studentsInClasses = await prisma.studentGroups.findMany({
      where: {
        group: { type: "CLASS" },
        NOT: { groupId },
      },
      select: { studentId: true },
    });
    const inClassIds = new Set(studentsInClasses.map((s) => s.studentId));

    availableWhere = {
      id: {
        notIn: [...assignedIds, ...inClassIds],
      },
    };
  } else if (groupType === "ELECTIVE_GROUP") {
    availableWhere = {
      id: { notIn: [...assignedIds] },
    };
  } else if (groupType === "SUBJECT_SUBGROUP") {
    const subgroup = await prisma.group.findUnique({
      where: { id: groupId },
      select: { parentId: true, subjectId: true },
    });

    if (subgroup?.parentId) {
      const parentStudentRows = await prisma.studentGroups.findMany({
        where: { groupId: subgroup.parentId },
        select: { studentId: true },
      });
      const parentStudentIds = parentStudentRows.map((r) => r.studentId);

      const siblingSubgroups = await prisma.group.findMany({
        where: {
          parentId: subgroup.parentId,
          subjectId: subgroup.subjectId,
          id: { not: groupId },
          type: "SUBJECT_SUBGROUP",
        },
        select: { id: true },
      });
      const siblingIds = siblingSubgroups.map((s) => s.id);

      const siblingStudentRows = siblingIds.length > 0
        ? await prisma.studentGroups.findMany({
            where: { groupId: { in: siblingIds } },
            select: { studentId: true },
          })
        : [];
      const siblingStudentIds = siblingStudentRows.map((r) => r.studentId);

      availableWhere = {
        id: {
          in: parentStudentIds,
          notIn: [...assignedIds, ...siblingStudentIds],
        },
      };
    } else {
      availableWhere = { id: { in: [] } };
    }
  }

  const studentInclude = {
    user: {
      select: { id: true, name: true, surname: true, patronymicName: true },
    },
    studentGroups: {
      include: {
        group: { select: { name: true, type: true } },
      },
    },
  } as const;

  const assigned = await prisma.student.findMany({
    where: { id: { in: [...assignedIds] } },
    include: studentInclude,
    orderBy: { user: { surname: "asc" } },
  });

  const available = await prisma.student.findMany({
    where: availableWhere,
    include: studentInclude,
    orderBy: { user: { surname: "asc" } },
  });

  const mapStudent = (s: (typeof assigned)[0]): StudentForAssignment => ({
    id: s.id,
    user: s.user,
    currentGroups: s.studentGroups.map((sg: { groupId: string; group: { name: string; type: GroupType } }) => ({
      groupId: sg.groupId,
      group: sg.group,
    })),
  });

  return {
    assigned: assigned.map(mapStudent),
    available: available.map(mapStudent),
  };
}

export async function assignStudentsToGroupAction(
  groupId: string,
  studentIds: string[]
) {
  const validated = assignStudentsSchema.parse({ groupId, studentIds });

  await prisma.studentGroups.createMany({
    data: validated.studentIds.map((studentId) => ({
      studentId,
      groupId: validated.groupId,
    })),
    skipDuplicates: true,
  });

  revalidatePath("/admin/groups");
}


export async function removeStudentsFromGroupAction(
  groupId: string,
  studentIds: string[]
): Promise<Record<string, number>> {
  const validated = assignStudentsSchema.parse({ groupId, studentIds });

  const subgroups = await prisma.group.findMany({
    where: { parentId: validated.groupId },
    select: { id: true },
  });
  const subgroupIds = subgroups.map((s) => s.id);

  await prisma.$transaction([
    prisma.studentGroups.deleteMany({
      where: {
        groupId: validated.groupId,
        studentId: { in: validated.studentIds },
      },
    }),
    ...(subgroupIds.length > 0
      ? [
          prisma.studentGroups.deleteMany({
            where: {
              groupId: { in: subgroupIds },
              studentId: { in: validated.studentIds },
            },
          }),
        ]
      : []),
  ]);

  const allAffectedIds = [validated.groupId, ...subgroupIds];
  const counts = await prisma.studentGroups.groupBy({
    by: ["groupId"],
    where: { groupId: { in: allAffectedIds } },
    _count: true,
  });

  const countMap: Record<string, number> = {};
  for (const gid of allAffectedIds) {
    countMap[gid] = counts.find((c) => c.groupId === gid)?._count ?? 0;
  }

  revalidatePath("/admin/groups");
  return countMap;
}

export async function getGroupStudents(groupId: string): Promise<StudentForAssignment[]> {
  idSchema.parse(groupId);

  const students = await prisma.student.findMany({
    where: {
      studentGroups: { some: { groupId } },
    },
    include: {
      user: {
        select: { id: true, name: true, surname: true, patronymicName: true },
      },
      studentGroups: {
        include: {
          group: { select: { name: true, type: true } },
        },
      },
    },
    orderBy: { user: { surname: "asc" } },
  });

  return students.map((s) => ({
    id: s.id,
    user: s.user,
    currentGroups: s.studentGroups.map((sg: { groupId: string; group: { name: string; type: GroupType } }) => ({
      groupId: sg.groupId,
      group: sg.group,
    })),
  }));
}

export async function createSubgroupsFromSplit(data: {
  parentGroupId: string;
  subjectId: string;
  subgroups: { name: string; studentIds: string[] }[];
}) {
  const validated = splitSchema.parse(data);

  const results = await prisma.$transaction(async (tx) => {
    const parentGroup = await tx.group.findUnique({
      where: { id: validated.parentGroupId },
      select: { id: true, type: true },
    });

    if (!parentGroup) {
      throw new Error("Родительская группа не найдена");
    }

    if (parentGroup.type !== "CLASS") {
      throw new Error("Разделение на подгруппы доступно только для классов");
    }

    const existingSubgroup = await tx.group.findFirst({
      where: {
        parentId: validated.parentGroupId,
        subjectId: validated.subjectId,
        type: "SUBJECT_SUBGROUP",
      },
      select: { id: true },
    });

    if (existingSubgroup) {
      throw new Error("Подгруппы по этому предмету уже существуют");
    }

    const subject = await tx.subject.findUnique({
      where: { id: validated.subjectId },
      select: { id: true },
    });

    if (!subject) {
      throw new Error("Предмет не найден");
    }

    const parentMembershipRows = await tx.studentGroups.findMany({
      where: { groupId: validated.parentGroupId },
      select: { studentId: true },
    });
    const parentStudentIds = new Set(parentMembershipRows.map((row) => row.studentId));

    const requestedStudentIds = validated.subgroups.flatMap((subgroup) => subgroup.studentIds);
    const uniqueRequestedStudentIds = new Set(requestedStudentIds);

    if (requestedStudentIds.length !== uniqueRequestedStudentIds.size) {
      throw new Error("Один и тот же ученик не может быть в нескольких подгруппах");
    }

    if (requestedStudentIds.length !== parentStudentIds.size) {
      throw new Error("Распределите всех учеников класса");
    }

    const invalidStudentIds = requestedStudentIds.filter(
      (studentId) => !parentStudentIds.has(studentId)
    );

    if (invalidStudentIds.length > 0) {
      throw new Error("Некоторые ученики не относятся к выбранному классу");
    }

    const created = [];

    for (const subgroup of validated.subgroups) {
      const group = await tx.group.create({
        data: {
          name: subgroup.name,
          type: "SUBJECT_SUBGROUP",
          parentId: validated.parentGroupId,
          subjectId: validated.subjectId,
        },
      });

      if (subgroup.studentIds.length > 0) {
        await tx.studentGroups.createMany({
          data: subgroup.studentIds.map((studentId) => ({
            studentId,
            groupId: group.id,
          })),
        });
      }

      created.push(group);
    }

    return created;
  });

  revalidatePath("/admin/groups");
  return results;
}

export async function getSubjects(): Promise<SubjectOption[]> {
  return prisma.subject.findMany({
    select: {id: true, name: true},
    orderBy: {name: "asc"},
  });
}

export type SubgroupEditorData = {
  parentGroupId: string;
  parentGroupName: string;
  subjectId: string;
  subjectName: string;
  students: StudentForAssignment[];
  sibling: { id: string; name: string; studentIds: string[] }[];
};

export async function getSubgroupEditorData(
  subgroupId: string
): Promise<SubgroupEditorData> {
  idSchema.parse(subgroupId);

  const subgroup = await prisma.group.findUniqueOrThrow({
    where: { id: subgroupId },
    include: {
      parentGroup: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
  });

  if (!subgroup.parentId || !subgroup.subjectId) {
    throw new Error("Subgroup must have a parent and subject");
  }

  const siblings = await prisma.group.findMany({
    where: {
      parentId: subgroup.parentId,
      subjectId: subgroup.subjectId,
      type: "SUBJECT_SUBGROUP",
    },
    select: {
      id: true,
      name: true,
      studentGroups: { select: { studentId: true } },
    },
    orderBy: { name: "asc" },
  });

  const parentStudents = await prisma.student.findMany({
    where: {
      studentGroups: { some: { groupId: subgroup.parentId } },
    },
    include: {
      user: {
        select: { id: true, name: true, surname: true, patronymicName: true },
      },
      studentGroups: {
        include: {
          group: { select: { name: true, type: true } },
        },
      },
    },
    orderBy: { user: { surname: "asc" } },
  });

  const students: StudentForAssignment[] = parentStudents.map((s) => ({
    id: s.id,
    user: s.user,
    currentGroups: s.studentGroups.map(
      (sg: { groupId: string; group: { name: string; type: GroupType } }) => ({
        groupId: sg.groupId,
        group: sg.group,
      })
    ),
  }));

  return {
    parentGroupId: subgroup.parentId,
    parentGroupName: subgroup.parentGroup?.name ?? "",
    subjectId: subgroup.subjectId,
    subjectName: subgroup.subject?.name ?? "",
    students,
    sibling: siblings.map((s) => ({
      id: s.id,
      name: s.name,
      studentIds: s.studentGroups.map((sg) => sg.studentId),
    })),
  };
}

const redistributeSchema = z.object({
  assignments: z.record(z.string(), z.array(z.string())),
});

export async function saveSubgroupRedistribution(
  assignments: Record<string, string[]>
) {
  const validated = redistributeSchema.parse({ assignments });

  const subgroupIds = Object.keys(validated.assignments);

  await prisma.$transaction([
    prisma.studentGroups.deleteMany({
      where: { groupId: { in: subgroupIds } },
    }),
    prisma.studentGroups.createMany({
      data: subgroupIds.flatMap((groupId) =>
        (validated.assignments[groupId] ?? []).map((studentId) => ({
          studentId,
          groupId,
        }))
      ),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/admin/groups");
}
