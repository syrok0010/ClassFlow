"use server";

import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import type { GroupType } from "@/generated/prisma/client";
import {
  assignStudentsSchema,
  createGroupSchema,
  groupTypeSchema,
  idSchema,
  redistributeSchema,
  splitSchema,
  updateGroupSchema,
  type AssignStudentsInput,
  type CreateGroupInput,
  type GroupTypeInput,
  type IdInput,
  type RedistributeInput,
  type SplitInput,
  type UpdateGroupInput,
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

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

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
): Promise<Result<GroupWithDetails[]>> {
  try {
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

    return ok(filterGroupsTree(rootGroups, filters));
  } catch (error) {
    return err(getErrorMessage(error, "Не удалось загрузить список групп"));
  }
}

export async function createGroupAction(data: CreateGroupInput) {
  try {
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
    return ok(group);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при создании группы"));
  }
}

export async function updateGroupAction(
  id: IdInput,
  data: UpdateGroupInput
) {
  try {
    idSchema.parse(id);
    const validated = updateGroupSchema.parse(data);

    const group = await prisma.group.update({
      where: { id },
      data: validated,
    });

    revalidatePath("/admin/groups");
    return ok(group);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при обновлении группы"));
  }
}

async function collectGroupIds(rootId: IdInput): Promise<string[]> {
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

export async function deleteGroupAction(id: IdInput) {
  try {
    idSchema.parse(id);

    const allGroupIds = await collectGroupIds(id);

    if (allGroupIds.length === 0) {
      return err("Группа не найдена");
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
    return ok(true);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при удалении группы"));
  }
}


export async function getStudentsForAssignment(
  groupId: IdInput,
  groupType: GroupTypeInput
): Promise<Result<{
  assigned: StudentForAssignment[];
  available: StudentForAssignment[];
}>> {
  try {
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

    return ok({
      assigned: assigned.map(mapStudent),
      available: available.map(mapStudent),
    });
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка загрузки учеников"));
  }
}

export async function assignStudentsToGroupAction(
  groupId: AssignStudentsInput["groupId"],
  studentIds: AssignStudentsInput["studentIds"]
) {
  try {
    const validated = assignStudentsSchema.parse({ groupId, studentIds });

    await prisma.studentGroups.createMany({
      data: validated.studentIds.map((studentId) => ({
        studentId,
        groupId: validated.groupId,
      })),
      skipDuplicates: true,
    });

    revalidatePath("/admin/groups");
    return ok(true);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при добавлении учеников в группу"));
  }
}


export async function removeStudentsFromGroupAction(
  groupId: AssignStudentsInput["groupId"],
  studentIds: AssignStudentsInput["studentIds"]
): Promise<Result<true>> {
  try {
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

    revalidatePath("/admin/groups");
    return ok(true);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при удалении учеников из группы"));
  }
}

export async function getGroupStudents(
  groupId: IdInput
): Promise<Result<StudentForAssignment[]>> {
  try {
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

    return ok(
      students.map((s) => ({
        id: s.id,
        user: s.user,
        currentGroups: s.studentGroups.map((sg: { groupId: string; group: { name: string; type: GroupType } }) => ({
          groupId: sg.groupId,
          group: sg.group,
        })),
      }))
    );
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка загрузки учеников группы"));
  }
}

export async function createSubgroupsFromSplit(data: SplitInput) {
  try {
    const validated = splitSchema.parse(data);

    const results = await prisma.$transaction(async (tx) => {
      const parentGroup = await tx.group.findUnique({
        where: { id: validated.parentGroupId },
        select: { id: true, type: true },
      });

      if (!parentGroup) {
        return err("Родительская группа не найдена");
      }

      if (parentGroup.type !== "CLASS") {
        return err("Разделение на подгруппы доступно только для классов");
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
        return err("Подгруппы по этому предмету уже существуют");
      }

      const subject = await tx.subject.findUnique({
        where: { id: validated.subjectId },
        select: { id: true },
      });

      if (!subject) {
        return err("Предмет не найден");
      }

      const parentMembershipRows = await tx.studentGroups.findMany({
        where: { groupId: validated.parentGroupId },
        select: { studentId: true },
      });
      const parentStudentIds = new Set(parentMembershipRows.map((row) => row.studentId));

      const requestedStudentIds = validated.subgroups.flatMap((subgroup) => subgroup.studentIds);
      const hasEmptySubgroup = validated.subgroups.some(
        (subgroup) => subgroup.studentIds.length === 0
      );
      const uniqueRequestedStudentIds = new Set(requestedStudentIds);

      if (hasEmptySubgroup) {
        return err("В каждой подгруппе должен быть минимум 1 ученик");
      }

      if (requestedStudentIds.length !== uniqueRequestedStudentIds.size) {
        return err("Один и тот же ученик не может быть в нескольких подгруппах");
      }

      if (requestedStudentIds.length !== parentStudentIds.size) {
        return err("Распределите всех учеников класса");
      }

      const invalidStudentIds = requestedStudentIds.filter(
        (studentId) => !parentStudentIds.has(studentId)
      );

      if (invalidStudentIds.length > 0) {
        return err("Некоторые ученики не относятся к выбранному классу");
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

      return ok(created);
    });

    if (results.error) {
      return results;
    }

    revalidatePath("/admin/groups");
    return ok(results.result);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при создании подгрупп"));
  }
}

export async function getSubjects(): Promise<Result<SubjectOption[]>> {
  try {
    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return ok(subjects);
  } catch (error) {
    return err(getErrorMessage(error, "Не удалось загрузить предметы"));
  }
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
  subgroupId: IdInput
): Promise<Result<SubgroupEditorData>> {
  try {
    idSchema.parse(subgroupId);

    const subgroup = await prisma.group.findUnique({
      where: { id: subgroupId },
      include: {
        parentGroup: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    if (!subgroup) {
      return err("Подгруппа не найдена");
    }

    if (!subgroup.parentId || !subgroup.subjectId) {
      return err("Подгруппа должна иметь родителя и предмет");
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

    return ok({
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
    });
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка загрузки данных подгрупп"));
  }
}

export async function saveSubgroupRedistribution(
  assignments: RedistributeInput["assignments"]
) {
  try {
    const validated = redistributeSchema.parse({ assignments });

    const subgroupIds = Object.keys(validated.assignments);

    if (subgroupIds.length === 0) {
      return err("Не переданы подгруппы для перераспределения");
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      const subgroups = await tx.group.findMany({
        where: { id: { in: subgroupIds } },
        select: {
          id: true,
          type: true,
          parentId: true,
          subjectId: true,
        },
      });

      if (subgroups.length !== subgroupIds.length) {
        return err("Некоторые подгруппы не найдены");
      }

      const first = subgroups[0];

      if (
        first.type !== "SUBJECT_SUBGROUP" ||
        !first.parentId ||
        !first.subjectId
      ) {
        return err("Некорректный набор подгрупп");
      }

      const sameHierarchy = subgroups.every(
        (subgroup) =>
          subgroup.type === "SUBJECT_SUBGROUP" &&
          subgroup.parentId === first.parentId &&
          subgroup.subjectId === first.subjectId
      );

      if (!sameHierarchy) {
        return err("Подгруппы должны относиться к одному классу и предмету");
      }

      const siblingRows = await tx.group.findMany({
        where: {
          parentId: first.parentId,
          subjectId: first.subjectId,
          type: "SUBJECT_SUBGROUP",
        },
        select: { id: true },
      });
      const siblingIds = siblingRows.map((row) => row.id);

      if (siblingIds.length === 0) {
        return err("Подгруппы для выбранного класса и предмета не найдены");
      }

      const providedSet = new Set(subgroupIds);
      const siblingSet = new Set(siblingIds);

      if (
        providedSet.size !== siblingSet.size ||
        siblingIds.some((id) => !providedSet.has(id))
      ) {
        return err("Передайте распределение для всех подгрупп этого предмета");
      }

      const requestedStudentIds = siblingIds.flatMap(
        (groupId) => validated.assignments[groupId] ?? []
      );
      const hasEmptySubgroup = siblingIds.some(
        (groupId) => (validated.assignments[groupId] ?? []).length === 0
      );
      const uniqueRequestedStudentIds = new Set(requestedStudentIds);

      if (hasEmptySubgroup) {
        return err("В каждой подгруппе должен быть минимум 1 ученик");
      }

      if (requestedStudentIds.length !== uniqueRequestedStudentIds.size) {
        return err("Один и тот же ученик не может быть в нескольких подгруппах");
      }

      const parentMembershipRows = await tx.studentGroups.findMany({
        where: { groupId: first.parentId },
        select: { studentId: true },
      });
      const parentStudentIds = new Set(
        parentMembershipRows.map((row) => row.studentId)
      );

      if (requestedStudentIds.length !== parentStudentIds.size) {
        return err("Распределите всех учеников класса");
      }

      const hasForeignStudents = requestedStudentIds.some(
        (studentId) => !parentStudentIds.has(studentId)
      );

      if (hasForeignStudents) {
        return err("Некоторые ученики не относятся к выбранному классу");
      }

      await tx.studentGroups.deleteMany({
        where: { groupId: { in: siblingIds } },
      });

      await tx.studentGroups.createMany({
        data: siblingIds.flatMap((groupId) =>
          (validated.assignments[groupId] ?? []).map((studentId) => ({
            studentId,
            groupId,
          }))
        ),
        skipDuplicates: true,
      });
      return ok(true);
    });

    if (transactionResult.error) {
      return transactionResult;
    }

    revalidatePath("/admin/groups");
    return ok(true);
  } catch (error) {
    return err(getErrorMessage(error, "Ошибка при обновлении подгрупп"));
  }
}
