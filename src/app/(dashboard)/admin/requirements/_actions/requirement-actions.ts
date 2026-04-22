"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/result";
import { requireAdminContext } from "@/lib/server-action-auth";
import type {
  RequirementEntry,
  RequirementGroupNode,
  RequirementMutationInput,
  RequirementMutationResult,
  RequirementsMatrixData,
  RequirementSubject,
} from "../_lib/types";
import { getActionErrorMessage } from "@/lib/action-error";
import { requirementMutationSchema } from "../_lib/schemas";

const REQUIREMENTS_PATH = "/admin/requirements";

export async function getRequirementsMatrixAction(): Promise<Result<RequirementsMatrixData>> {
  try {
    await requireAdminContext();

    const [groups, subjects, requirements] = await Promise.all([
      prisma.group.findMany({
        where: {
          type: { in: ["CLASS", "ELECTIVE_GROUP"] },
        },
        select: {
          id: true,
          name: true,
          type: true,
          grade: true,
          parentId: true,
          subjectId: true,
        },
        orderBy: [
          { type: "asc" },
          { grade: "asc" },
          { name: "asc" },
        ],
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
      groups: groups as RequirementGroupNode[],
      subjects: subjects as RequirementSubject[],
      requirements: requirements as RequirementEntry[],
    };

    return ok(payload);
  } catch (error) {
    return err(getActionErrorMessage(error, "Не удалось загрузить матрицу нагрузки"));
  }
}

export async function upsertRequirementAction(
  input: RequirementMutationInput
): Promise<Result<RequirementMutationResult>> {
  try {
    await requireAdminContext();

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
    return err(getActionErrorMessage(error, "Не удалось сохранить требование"));
  }
}
