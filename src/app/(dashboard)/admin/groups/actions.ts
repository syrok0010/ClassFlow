"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { GroupType } from "@/generated/prisma/client";
import type { GroupWithDetails, StudentForAssignment, SubjectOption } from "./types";

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
  type: GroupType;
  grade?: number | null;
  parentId?: string | null;
  subjectId?: string | null;
}) {
  const group = await prisma.group.create({
    data: {
      name: data.name,
      type: data.type,
      grade: data.grade ?? null,
      parentId: data.parentId ?? null,
      subjectId: data.subjectId ?? null,
    },
  });

  revalidatePath("/admin/groups");
  return group;
}

// ─── Update Group ───────────────────────────────────────────────────────────

export async function updateGroupAction(
  id: string,
  data: { name?: string; type?: GroupType; grade?: number | null }
) {
  const group = await prisma.group.update({
    where: { id },
    data,
  });

  revalidatePath("/admin/groups");
  return group;
}

// ─── Delete Group (cascading subGroups) ─────────────────────────────────────

export async function deleteGroupAction(id: string) {
  // First, recursively delete subgroups and their student assignments
  const subGroups = await prisma.group.findMany({
    where: { parentId: id },
    select: { id: true },
  });

  for (const sub of subGroups) {
    await deleteGroupAction(sub.id);
  }

  // Delete student assignments for this group
  await prisma.studentGroups.deleteMany({
    where: { groupId: id },
  });

  // Delete group subject requirements
  await prisma.groupSubjectRequirement.deleteMany({
    where: { groupId: id },
  });

  // Delete the group itself
  await prisma.group.delete({
    where: { id },
  });

  revalidatePath("/admin/groups");
}

// ─── Get Students for Assignment (Transfer List) ────────────────────────────

export async function getStudentsForAssignment(
  groupId: string,
  groupType: GroupType
): Promise<{
  assigned: StudentForAssignment[];
  available: StudentForAssignment[];
}> {
  // Get students already in the group
  const assignedStudentIds = await prisma.studentGroups.findMany({
    where: { groupId },
    select: { studentId: true },
  });
  const assignedIds = new Set(assignedStudentIds.map((s) => s.studentId));

  // Determine the available pool based on group type
  let availableWhere: Record<string, unknown> = {};

  if (groupType === "CLASS") {
    // For a class: show students not in any CLASS group
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
    // For elective: show all students not already in this group
    availableWhere = {
      id: { notIn: [...assignedIds] },
    };
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
  };

  const [assigned, available] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: [...assignedIds] } },
      include: studentInclude,
      orderBy: { user: { surname: "asc" } },
    }),
    prisma.student.findMany({
      where: availableWhere,
      include: studentInclude,
      orderBy: { user: { surname: "asc" } },
    }),
  ]);

  const mapStudent = (s: typeof assigned[0]): StudentForAssignment => ({
    id: s.id,
    user: s.user,
    currentGroups: s.studentGroups.map((sg) => ({
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
  await prisma.studentGroups.createMany({
    data: studentIds.map((studentId) => ({ studentId, groupId })),
    skipDuplicates: true,
  });

  revalidatePath("/admin/groups");
}

// ─── Remove Students from Group ─────────────────────────────────────────────

export async function removeStudentsFromGroupAction(
  groupId: string,
  studentIds: string[]
) {
  await prisma.studentGroups.deleteMany({
    where: {
      groupId,
      studentId: { in: studentIds },
    },
  });

  revalidatePath("/admin/groups");
}

// ─── Get Students of a Parent Group (for Splitter) ──────────────────────────

export async function getGroupStudents(groupId: string): Promise<StudentForAssignment[]> {
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
    currentGroups: s.studentGroups.map((sg) => ({
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
  const results = [];

  for (const subgroup of data.subgroups) {
    const group = await prisma.group.create({
      data: {
        name: subgroup.name,
        type: "SUBJECT_SUBGROUP",
        parentId: data.parentGroupId,
        subjectId: data.subjectId,
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
