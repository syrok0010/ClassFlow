import { z } from "zod/v4";

export const groupTypeSchema = z.enum([
  "CLASS",
  "KINDERGARTEN_GROUP",
  "SUBJECT_SUBGROUP",
  "ELECTIVE_GROUP",
]);

export const groupNameSchema = z
  .string()
  .trim()
  .min(1, "Название обязательно")
  .max(512, "Максимум 512 символов");

export const groupGradeSchema = z.number().int().min(1).max(11).nullable().optional();
export const groupLinkedClassIdsSchema = z.array(z.string().min(1)).optional();

export const createGroupSchema = z
  .object({
    name: groupNameSchema,
    type: groupTypeSchema,
    grade: groupGradeSchema,
    parentId: z.string().min(1).nullable().optional(),
    subjectId: z.string().min(1).nullable().optional(),
    linkedClassIds: groupLinkedClassIdsSchema,
  })
  .superRefine((value, ctx) => {
    if (
      value.type === "ELECTIVE_GROUP" &&
      (!value.linkedClassIds || value.linkedClassIds.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["linkedClassIds"],
        message: "Выберите хотя бы один класс",
      });
    }
  });

export const updateGroupSchema = z.object({
  name: groupNameSchema.optional(),
  type: groupTypeSchema.optional(),
  grade: groupGradeSchema,
  subjectId: z.string().min(1).nullable().optional(),
  linkedClassIds: groupLinkedClassIdsSchema,
});

export const idSchema = z.string().min(1, "ID обязателен");

export const updateGroupStudentsSchema = z
  .object({
    groupId: idSchema,
    assignStudentIds: z.array(idSchema),
    removeStudentIds: z.array(idSchema),
  })
  .refine(
    (value) => value.assignStudentIds.length > 0 || value.removeStudentIds.length > 0,
    "Передайте изменения состава группы"
  );

export const splitSchema = z.object({
  parentGroupId: idSchema,
  subjectId: idSchema,
  subgroups: z
    .array(
      z.object({
        name: groupNameSchema,
        studentIds: z.array(idSchema),
      })
    )
    .min(1),
});

export const redistributeSchema = z.object({
  assignments: z.record(z.string(), z.array(z.string())),
});

export type GroupTypeInput = z.infer<typeof groupTypeSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type IdInput = z.infer<typeof idSchema>;
export type UpdateGroupStudentsInput = z.infer<typeof updateGroupStudentsSchema>;
export type SplitInput = z.infer<typeof splitSchema>;
export type RedistributeInput = z.infer<typeof redistributeSchema>;

export const groupGradeInputSchema = z.string().refine(
  (value) =>
    value === "" ||
    (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 11),
  "1-11"
);

export function parseGroupGradeInput(value: string): number | null {
  if (value === "") {
    return null;
  }

  if (!/^\d+$/.test(value)) {
    return Number.NaN;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1 || parsed > 11) {
    return Number.NaN;
  }

  return parsed;
}
