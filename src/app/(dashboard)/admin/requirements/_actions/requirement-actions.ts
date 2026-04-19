"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import type {
  RequirementEntry,
  RequirementGroupNode,
  RequirementMutationInput,
  RequirementMutationResult,
  RequirementsMatrixData,
  RequirementSubject,
} from "../_lib/types";

const REQUIREMENTS_PATH = "/admin/requirements";

const requirementMutationSchema = z.object({
  groupId: z.string().min(1),
  subjectId: z.string().min(1),
  lessonsPerWeek: z.number().int().min(0).max(99),
  durationInMinutes: z.number().int().min(1).max(180),
  breakDuration: z.number().int().min(0).max(60),
});

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function buildGroupTree(groups: Array<{
  id: string;
  name: string;
  type: "CLASS" | "KINDERGARTEN_GROUP" | "SUBJECT_SUBGROUP" | "ELECTIVE_GROUP";
  grade: number | null;
  parentId: string | null;
  subjectId: string | null;
}>): RequirementGroupNode[] {
  const allowedRootTypes = new Set(["CLASS", "ELECTIVE_GROUP"]);
  const byParent = new Map<string | null, typeof groups>();

  for (const group of groups) {
    const bucket = byParent.get(group.parentId);
    if (bucket) {
      bucket.push(group);
      continue;
    }

    byParent.set(group.parentId, [group]);
  }

  const toNode = (group: (typeof groups)[number]): RequirementGroupNode => {
    const children = (byParent.get(group.id) ?? [])
      .filter((child) => child.type === "SUBJECT_SUBGROUP")
      .sort((a, b) => a.name.localeCompare(b.name, "ru", { sensitivity: "base" }));

    return {
      id: group.id,
      name: group.name,
      type: group.type,
      grade: group.grade,
      parentId: group.parentId,
      subjectId: group.subjectId,
      subGroups: children.map(toNode),
    };
  };

  return groups
    .filter((group) => group.parentId === null && allowedRootTypes.has(group.type))
    .sort((a, b) => {
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }

      if ((a.grade ?? 0) !== (b.grade ?? 0)) {
        return (a.grade ?? 0) - (b.grade ?? 0);
      }

      return a.name.localeCompare(b.name, "ru", { sensitivity: "base" });
    })
    .map(toNode);
}

export async function getRequirementsMatrixAction(): Promise<Result<RequirementsMatrixData>> {
  try {
    const [groups, subjects, requirements] = await Promise.all([
      prisma.group.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          grade: true,
          parentId: true,
          subjectId: true,
        },
      }),
      prisma.subject.findMany({
        select: {
          id: true,
          name: true,
          type: true,
        },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),
      prisma.groupSubjectRequirement.findMany({
        select: {
          groupId: true,
          subjectId: true,
          lessonsPerWeek: true,
          durationInMinutes: true,
          breakDuration: true,
        },
      }),
    ]);

    const payload: RequirementsMatrixData = {
      groups: buildGroupTree(groups),
      subjects: subjects as RequirementSubject[],
      requirements: requirements as RequirementEntry[],
    };

    return ok(payload);
  } catch (error) {
    return err(getErrorMessage(error, "Не удалось загрузить матрицу нагрузки"));
  }
}

export async function upsertRequirementAction(
  input: RequirementMutationInput
): Promise<Result<RequirementMutationResult>> {
  try {
    const validated = requirementMutationSchema.parse(input);

    const baseGroup = await prisma.group.findUnique({
      where: { id: validated.groupId },
      select: {
        id: true,
        type: true,
      },
    });

    if (!baseGroup) {
      return err("Группа не найдена");
    }

    const subjectExists = await prisma.subject.findUnique({
      where: { id: validated.subjectId },
      select: { id: true },
    });

    if (!subjectExists) {
      return err("Предмет не найден");
    }

    const targetGroupIds =
      baseGroup.type === "CLASS"
        ? [
            validated.groupId,
            ...(await prisma.group
              .findMany({
                where: {
                  parentId: validated.groupId,
                  type: "SUBJECT_SUBGROUP",
                  subjectId: validated.subjectId,
                },
                select: { id: true },
              })
              .then((rows) => rows.map((row) => row.id))),
          ]
        : [validated.groupId];

    if (validated.lessonsPerWeek === 0) {
      await prisma.groupSubjectRequirement.deleteMany({
        where: {
          groupId: { in: targetGroupIds },
          subjectId: validated.subjectId,
        },
      });

      revalidatePath(REQUIREMENTS_PATH);

      return ok({
        updated: [],
        deletedGroupIds: targetGroupIds,
      });
    }

    await prisma.$transaction(
      targetGroupIds.map((groupId) =>
        prisma.groupSubjectRequirement.upsert({
          where: {
            groupId_subjectId: {
              groupId,
              subjectId: validated.subjectId,
            },
          },
          update: {
            lessonsPerWeek: validated.lessonsPerWeek,
            durationInMinutes: validated.durationInMinutes,
            breakDuration: validated.breakDuration,
          },
          create: {
            groupId,
            subjectId: validated.subjectId,
            lessonsPerWeek: validated.lessonsPerWeek,
            durationInMinutes: validated.durationInMinutes,
            breakDuration: validated.breakDuration,
          },
        })
      )
    );

    revalidatePath(REQUIREMENTS_PATH);

    return ok({
      updated: targetGroupIds.map((groupId) => ({
        groupId,
        subjectId: validated.subjectId,
        lessonsPerWeek: validated.lessonsPerWeek,
        durationInMinutes: validated.durationInMinutes,
        breakDuration: validated.breakDuration,
      })),
      deletedGroupIds: [],
    });
  } catch (error) {
    return err(getErrorMessage(error, "Не удалось сохранить требование"));
  }
}
