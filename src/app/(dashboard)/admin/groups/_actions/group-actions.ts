"use server";

import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import { getActionErrorMessage } from "@/lib/action-error";
import { revalidatePath } from "next/cache";
import type { GroupType } from "@/generated/prisma/client";
import { requireAdminContext } from "@/lib/server-action-auth";
import {
  createGroupSchema,
  groupTypeSchema,
  idSchema,
  redistributeSchema,
  splitSchema,
  updateGroupSchema,
  updateGroupStudentsSchema,
  type CreateGroupInput,
  type GroupTypeInput,
  type IdInput,
  type RedistributeInput,
  type SplitInput,
  type UpdateGroupStudentsInput,
  type UpdateGroupInput,
} from "../_lib/group-schemas";
import type {
  StudentForAssignment,
} from "../_lib/types";

async function validateLinkedClassIds(
  linkedClassIds: string[] | undefined
): Promise<Result<string[]>> {
  const uniqueIds = [...new Set(linkedClassIds ?? [])];

  if (uniqueIds.length === 0) {
    return err("Выберите хотя бы один класс");
  }

  const classes = await prisma.group.findMany({
    where: {
      id: { in: uniqueIds },
      type: "CLASS",
      parentId: null,
    },
    select: { id: true },
  });

  if (classes.length !== uniqueIds.length) {
    return err("Можно выбрать только существующие классы");
  }

  return ok(uniqueIds);
}

async function getEligibleElectiveStudentIds(
  electiveGroupId: string
): Promise<Result<string[]>> {
  const linkedClassRows = await prisma.electiveGroupClassLink.findMany({
    where: { electiveGroupId },
    select: { classGroupId: true },
  });
  const linkedClassIds = linkedClassRows.map((item) => item.classGroupId);

  if (linkedClassIds.length === 0) {
    return err("Для кружка не настроены доступные классы");
  }

  const linkedStudents = await prisma.studentGroups.findMany({
    where: {
      groupId: { in: linkedClassIds },
    },
    select: { studentId: true },
  });

  return ok([...new Set(linkedStudents.map((item) => item.studentId))]);
}

export async function createGroupAction(data: CreateGroupInput) {
  await requireAdminContext();

  try {
    const validated = createGroupSchema.parse(data);
    const linkedClassIds =
      validated.type === "ELECTIVE_GROUP"
        ? await validateLinkedClassIds(validated.linkedClassIds)
        : ok<string[]>([]);

    if (linkedClassIds.error) {
      return err(linkedClassIds.error);
    }

    const nextLinkedClassIds = linkedClassIds.result ?? [];

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          name: validated.name,
          type: validated.type,
          grade: validated.grade ?? null,
          parentId: validated.parentId ?? null,
          subjectId: validated.subjectId ?? null,
        },
      });

      if (nextLinkedClassIds.length > 0) {
        await tx.electiveGroupClassLink.createMany({
          data: nextLinkedClassIds.map((classGroupId) => ({
            electiveGroupId: created.id,
            classGroupId,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    revalidatePath("/admin/groups");
    return ok(group);
  } catch (error) {
    return err(getActionErrorMessage(error, "Ошибка при создании группы"));
  }
}

export async function updateGroupAction(
  id: IdInput,
  data: UpdateGroupInput
) {
  await requireAdminContext();

  try {
    idSchema.parse(id);
    const validated = updateGroupSchema.parse(data);
    const existingGroup = await prisma.group.findUnique({
      where: { id },
      select: { id: true, type: true },
    });

    if (!existingGroup) {
      return err("Группа не найдена");
    }

    const nextType = validated.type ?? existingGroup.type;
    const linkedClassIds =
      nextType === "ELECTIVE_GROUP" && validated.linkedClassIds
        ? await validateLinkedClassIds(validated.linkedClassIds)
        : ok<string[]>([]);

    if (linkedClassIds.error) {
      return err(linkedClassIds.error);
    }

    const groupData = {
      name: validated.name,
      type: validated.type,
      grade: validated.grade,
      subjectId: validated.subjectId,
    };

    const group = await prisma.$transaction(async (tx) => {
      const updated = await tx.group.update({
        where: { id },
        data: groupData,
      });

      if (nextType !== "ELECTIVE_GROUP") {
        await tx.electiveGroupClassLink.deleteMany({
          where: { electiveGroupId: id },
        });
        return updated;
      }

      if (validated.linkedClassIds) {
        await tx.electiveGroupClassLink.deleteMany({
          where: { electiveGroupId: id },
        });

        await tx.electiveGroupClassLink.createMany({
          data: (linkedClassIds.result ?? []).map((classGroupId) => ({
            electiveGroupId: id,
            classGroupId,
          })),
          skipDuplicates: true,
        });
      }

      return updated;
    });

    revalidatePath("/admin/groups");
    return ok(group);
  } catch (error) {
    return err(getActionErrorMessage(error, "Ошибка при обновлении группы"));
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
  await requireAdminContext();

  try {
    idSchema.parse(id);

    const allGroupIds = await collectGroupIds(id);

    if (allGroupIds.length === 0) {
      return err("Группа не найдена");
    }

    await prisma.$transaction([
      prisma.scheduleEntry.deleteMany({
        where: {
          OR: [
            { deliveryGroupId: { in: allGroupIds } },
            { coveredClasses: { some: { classGroupId: { in: allGroupIds } } } },
          ],
        },
      }),
      prisma.weeklyScheduleTemplate.deleteMany({
        where: {
          OR: [
            { deliveryGroupId: { in: allGroupIds } },
            { openClasses: { some: { classGroupId: { in: allGroupIds } } } },
            { coveredClasses: { some: { classGroupId: { in: allGroupIds } } } },
          ],
        },
      }),
      prisma.studentGroups.deleteMany({
        where: { groupId: { in: allGroupIds } },
      }),
      prisma.groupSubjectRequirement.deleteMany({
        where: { groupId: { in: allGroupIds } },
      }),
      prisma.electiveGroupClassLink.deleteMany({
        where: {
          OR: [
            { electiveGroupId: { in: allGroupIds } },
            { classGroupId: { in: allGroupIds } },
          ],
        },
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
    return err(getActionErrorMessage(error, "Ошибка при удалении группы"));
  }
}


export async function getStudentsForAssignment(
  groupId: IdInput,
  groupType: GroupTypeInput
): Promise<Result<{
  assigned: StudentForAssignment[];
  available: StudentForAssignment[];
}>> {
  await requireAdminContext();

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
      const eligibleStudentIds = await getEligibleElectiveStudentIds(groupId);

      if (eligibleStudentIds.error) {
        availableWhere = { id: { in: [] } };
      } else {
        availableWhere = {
          id: {
            in: eligibleStudentIds.result ?? [],
            notIn: [...assignedIds],
          },
        };
      }
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
    return err(getActionErrorMessage(error, "Ошибка загрузки учеников"));
  }
}

export async function updateGroupStudentsAction(
  data: UpdateGroupStudentsInput
): Promise<Result<true>> {
  await requireAdminContext();

  try {
    const validated = updateGroupStudentsSchema.parse(data);
    const targetGroup = await prisma.group.findUnique({
      where: { id: validated.groupId },
      select: { id: true, type: true },
    });

    if (!targetGroup) {
      return err("Группа не найдена");
    }

    if (targetGroup.type === "ELECTIVE_GROUP" && validated.assignStudentIds.length > 0) {
      const eligibleStudentIds = await getEligibleElectiveStudentIds(validated.groupId);
      if (eligibleStudentIds.error) {
        return err(eligibleStudentIds.error);
      }

      const eligibleIds = new Set(eligibleStudentIds.result ?? []);

      if (validated.assignStudentIds.some((studentId) => !eligibleIds.has(studentId))) {
        return err("Можно добавлять только учеников из привязанных классов");
      }
    }

    const subgroups = await prisma.group.findMany({
      where: { parentId: validated.groupId },
      select: { id: true },
    });
    const subgroupIds = subgroups.map((s) => s.id);

    await prisma.$transaction([
      ...(validated.assignStudentIds.length > 0
        ? [
            prisma.studentGroups.createMany({
              data: validated.assignStudentIds.map((studentId) => ({
                studentId,
                groupId: validated.groupId,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
      ...(validated.removeStudentIds.length > 0
        ? [
            prisma.studentGroups.deleteMany({
              where: {
                groupId: validated.groupId,
                studentId: { in: validated.removeStudentIds },
              },
            }),
            ...(subgroupIds.length > 0
              ? [
                  prisma.studentGroups.deleteMany({
                    where: {
                      groupId: { in: subgroupIds },
                      studentId: { in: validated.removeStudentIds },
                    },
                  }),
                ]
              : []),
          ]
        : []),
    ]);

    revalidatePath("/admin/groups");
    return ok(true);
  } catch (error) {
    return err(
      getActionErrorMessage(error, "Ошибка при обновлении состава группы")
    );
  }
}

export async function getGroupStudents(
  groupId: IdInput
): Promise<Result<StudentForAssignment[]>> {
  await requireAdminContext();

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
    return err(getActionErrorMessage(error, "Ошибка загрузки учеников группы"));
  }
}

export async function createSubgroupsFromSplit(data: SplitInput) {
  await requireAdminContext();

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
    return err(getActionErrorMessage(error, "Ошибка при создании подгрупп"));
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
  await requireAdminContext();

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
    return err(getActionErrorMessage(error, "Ошибка загрузки данных подгрупп"));
  }
}

export async function saveSubgroupRedistribution(
  assignments: RedistributeInput["assignments"]
) {
  await requireAdminContext();

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
    return err(getActionErrorMessage(error, "Ошибка при обновлении подгрупп"));
  }
}
