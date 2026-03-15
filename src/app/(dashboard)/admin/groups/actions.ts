"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import type { GroupType } from "@/generated/prisma/client";
import type { GroupWithDetails, StudentForAssignment, SubjectOption } from "./types";

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const GroupTypeEnum = z.enum(["CLASS", "KINDERGARTEN_GROUP", "SUBJECT_SUBGROUP", "ELECTIVE_GROUP"]);

const createGroupSchema = z.object({
  name: z.string().min(1, "Название обязательно").max(512),
  type: GroupTypeEnum,
  grade: z.number().int().min(1).max(11).nullable().optional(),
  parentId: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(512).optional(),
  type: GroupTypeEnum.optional(),
  grade: z.number().int().min(1).max(11).nullable().optional(),
});

const idSchema = z.string().min(1, "ID обязателен");

const assignStudentsSchema = z.object({
  groupId: z.string().min(1),
  studentIds: z.array(z.string().min(1)).min(1),
});

const splitSchema = z.object({
  parentGroupId: z.string().min(1),
  subjectId: z.string().min(1),
  subgroups: z.array(
    z.object({
      name: z.string().min(1).max(512),
      studentIds: z.array(z.string()),
    })
  ).min(1),
});

// ─── Fetch Groups (Tree structure) ──────────────────────────────────────────

export async function getGroupsTree(): Promise<GroupWithDetails[]> {
  const groups = await prisma.group.findMany({
    where: { parentId: null },
    include: {
      subject: { select: { id: true, name: true } },
      _count: { select: { studentGroups: true } },
      subGroups: {
        include: {
          subject: { select: { id: true, name: true } },
          _count: { select: { studentGroups: true } },
          subGroups: {
            include: {
              subject: { select: { id: true, name: true } },
              _count: { select: { studentGroups: true } },
              subGroups: true,
            },
          },
        },
      },
    },
    orderBy: [{ type: "asc" }, { grade: "asc" }, { name: "asc" }],
  });

  return groups as GroupWithDetails[];
}

// ─── Create Group ───────────────────────────────────────────────────────────

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

// ─── Update Group ───────────────────────────────────────────────────────────

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

// ─── Delete Group (optimized: collect all IDs then batch delete) ────────────

async function collectGroupIds(parentId: string): Promise<string[]> {
  const children = await prisma.group.findMany({
    where: { parentId },
    select: { id: true },
  });

  const allIds: string[] = [parentId];
  for (const child of children) {
    const childIds = await collectGroupIds(child.id);
    allIds.push(...childIds);
  }

  return allIds;
}

export async function deleteGroupAction(id: string) {
  idSchema.parse(id);

  // Collect all group IDs (the group + all descendants)
  const allGroupIds = await collectGroupIds(id);

  // Batch delete all related records, then all groups
  await prisma.$transaction([
    prisma.studentGroups.deleteMany({
      where: { groupId: { in: allGroupIds } },
    }),
    prisma.groupSubjectRequirement.deleteMany({
      where: { groupId: { in: allGroupIds } },
    }),
    // Delete in reverse order (children first) by deleting all non-root, then root
    // Actually, since we have no FK cascade, we must delete children before parents.
    // Delete all children (non-root) first, then the root
    ...allGroupIds
      .slice()
      .reverse()
      .map((gid) =>
        prisma.group.delete({ where: { id: gid } })
      ),
  ]);

  revalidatePath("/admin/groups");
}

// ─── Get Students for Assignment (Transfer List) ────────────────────────────

export async function getStudentsForAssignment(
  groupId: string,
  groupType: string
): Promise<{
  assigned: StudentForAssignment[];
  available: StudentForAssignment[];
}> {
  idSchema.parse(groupId);
  GroupTypeEnum.parse(groupType);

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
    // For subgroups: available = parent class students not in THIS subgroup
    // AND not in any sibling subgroup (same parent + same subject).
    const subgroup = await prisma.group.findUnique({
      where: { id: groupId },
      select: { parentId: true, subjectId: true },
    });

    if (subgroup?.parentId) {
      // Get parent class students
      const parentStudentRows = await prisma.studentGroups.findMany({
        where: { groupId: subgroup.parentId },
        select: { studentId: true },
      });
      const parentStudentIds = parentStudentRows.map((r) => r.studentId);

      // Find sibling subgroups (same parent + same subject, excluding self)
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

      // Get students already assigned to sibling subgroups
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
      // Fallback: no parent — show nothing as available
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

// ─── Assign Students to Group ───────────────────────────────────────────────

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

// ─── Remove Students from Group ─────────────────────────────────────────────

export async function removeStudentsFromGroupAction(
  groupId: string,
  studentIds: string[]
) {
  const validated = assignStudentsSchema.parse({ groupId, studentIds });

  await prisma.studentGroups.deleteMany({
    where: {
      groupId: validated.groupId,
      studentId: { in: validated.studentIds },
    },
  });

  revalidatePath("/admin/groups");
}

// ─── Get Students of a Parent Group (for Splitter) ──────────────────────────

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

// ─── Create Subgroups from Split (Splitter UI) ─────────────────────────────

export async function createSubgroupsFromSplit(data: {
  parentGroupId: string;
  subjectId: string;
  subgroups: { name: string; studentIds: string[] }[];
}) {
  const validated = splitSchema.parse(data);

  const results = [];

  for (const subgroup of validated.subgroups) {
    const group = await prisma.group.create({
      data: {
        name: subgroup.name,
        type: "SUBJECT_SUBGROUP",
        parentId: validated.parentGroupId,
        subjectId: validated.subjectId,
      },
    });

    if (subgroup.studentIds.length > 0) {
      await prisma.studentGroups.createMany({
        data: subgroup.studentIds.map((studentId) => ({
          studentId,
          groupId: group.id,
        })),
      });
    }

    results.push(group);
  }

  revalidatePath("/admin/groups");
  return results;
}

// ─── Get Subjects (for Splitter UI) ─────────────────────────────────────────

export async function getSubjects(): Promise<SubjectOption[]> {
  const subjects = await prisma.subject.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return subjects;
}

// ─── Get Subgroup Editor Data (for editing subgroup student distribution) ────

export type SubgroupEditorData = {
  parentGroupId: string;
  parentGroupName: string;
  subjectId: string;
  subjectName: string;
  /** All students in the parent class */
  students: StudentForAssignment[];
  /** Sibling subgroups (same parent + same subject), each with assigned student IDs */
  sibling: { id: string; name: string; studentIds: string[] }[];
};

export async function getSubgroupEditorData(
  subgroupId: string
): Promise<SubgroupEditorData> {
  idSchema.parse(subgroupId);

  // Load the subgroup to find parentId + subjectId
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

  // Load all sibling subgroups (same parent + same subject)
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

  // Load all students in the parent class
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

// ─── Save Subgroup Redistribution ───────────────────────────────────────────

const redistributeSchema = z.object({
  /** Map of subgroupId -> studentIds */
  assignments: z.record(z.string(), z.array(z.string())),
});

export async function saveSubgroupRedistribution(
  assignments: Record<string, string[]>
) {
  const validated = redistributeSchema.parse({ assignments });

  const subgroupIds = Object.keys(validated.assignments);

  await prisma.$transaction([
    // Remove all existing student assignments from these subgroups
    prisma.studentGroups.deleteMany({
      where: { groupId: { in: subgroupIds } },
    }),
    // Create new assignments
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
