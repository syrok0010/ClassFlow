import type { GroupType } from "@/generated/prisma/client";
import { getActionErrorMessage } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import { requireAdminContext } from "@/lib/server-action-auth";
import type { GroupWithDetails, SubjectOption } from "./types";

export type GroupsTreeFilters = {
  search?: string;
  type?: GroupType;
};

function filterGroupsTree(
  groups: GroupWithDetails[],
  filters: GroupsTreeFilters
): GroupWithDetails[] {
  const search = filters.search?.trim().toLowerCase();

  const filterNodeBySearch = (
    node: GroupWithDetails
  ): GroupWithDetails | null => {
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
  await requireAdminContext();

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
    return err(getActionErrorMessage(error, "Не удалось загрузить список групп"));
  }
}

export async function getSubjects(): Promise<Result<SubjectOption[]>> {
  await requireAdminContext();

  try {
    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return ok(subjects);
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось загрузить предметы"));
  }
}
