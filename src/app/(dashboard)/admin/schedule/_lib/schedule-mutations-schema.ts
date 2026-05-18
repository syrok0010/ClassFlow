import type { GroupType, SubjectType } from "@/generated/prisma/enums";
import { z } from "zod";

type ScheduleValidationSubject = {
  type: SubjectType;
};

type ScheduleValidationGroup = {
  type: GroupType;
  subjectId: string | null;
};

type AdminScheduleTemplateValidationContext = {
  subjectsById?: Record<string, ScheduleValidationSubject>;
  groupsById?: Record<string, ScheduleValidationGroup>;
  classIds?: readonly string[];
};

const adminScheduleTemplateMutationSchemaBase = z.object({
  templateId: z.string().optional(),
  dayOfWeek: z.number().int().min(1).max(5).nullable(),
  startMinutes: z.number().int().min(0).max(24 * 60 - 1).nullable(),
  endMinutes: z.number().int().min(1).max(24 * 60).nullable(),
  deliveryMode: z.enum(["DIRECT_GROUP", "ELECTIVE_GROUP", "SHARED_CLASSES"]),
  deliveryGroupId: z.string().nullable(),
  openClassIds: z.array(z.string().min(1)),
  coveredClassIds: z.array(z.string().min(1)),
  subjectId: z.string().min(1, "Выберите предмет"),
  roomId: z.string().nullable(),
  teacherId: z.string().nullable(),
});

export function createAdminScheduleTemplateMutationSchema(
  context: AdminScheduleTemplateValidationContext = {},
) {
  const classIdSet = context.classIds ? new Set(context.classIds) : null;

  return adminScheduleTemplateMutationSchemaBase.superRefine((value, ctx) => {
    const hasScheduledFields =
      value.dayOfWeek !== null
      || value.startMinutes !== null
      || value.endMinutes !== null;
    const hasFullScheduledFields =
      value.dayOfWeek !== null
      && value.startMinutes !== null
      && value.endMinutes !== null;

    if (hasScheduledFields && !hasFullScheduledFields) {
      ctx.addIssue({
        code: "custom",
        path: ["dayOfWeek"],
        message: "Для карточки в расписании нужно указать день, время начала и время окончания",
      });
    }

    if (
      hasFullScheduledFields
      && value.startMinutes !== null
      && value.endMinutes !== null
      && value.endMinutes <= value.startMinutes
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endMinutes"],
        message: "Время окончания должно быть позже времени начала",
      });
    }

    if (value.deliveryMode === "DIRECT_GROUP") {
      if (!value.deliveryGroupId) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryGroupId"],
          message: "Выберите группу",
        });
      }

      if (value.openClassIds.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["openClassIds"],
          message: "Для прямой карточки нельзя задавать открытые классы",
        });
      }

      if (value.coveredClassIds.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["coveredClassIds"],
          message: "Для прямой карточки нельзя задавать покрываемые классы",
        });
      }
    }

    if (value.deliveryMode === "ELECTIVE_GROUP") {
      if (!value.deliveryGroupId) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryGroupId"],
          message: "Выберите группу по выбору",
        });
      }

      if (value.openClassIds.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["openClassIds"],
          message: "Укажите хотя бы один класс, для которого открыт доп по выбору",
        });
      }

      if (value.coveredClassIds.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["coveredClassIds"],
          message: "Для допа по выбору нельзя задавать покрываемые классы",
        });
      }
    }

    if (value.deliveryMode === "SHARED_CLASSES") {
      if (value.deliveryGroupId) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryGroupId"],
          message: "Для общего занятия нельзя задавать группу доставки",
        });
      }

      if (value.openClassIds.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["openClassIds"],
          message: "Для общего занятия нельзя задавать открытые классы",
        });
      }

      if (value.coveredClassIds.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["coveredClassIds"],
          message: "Общее занятие должно покрывать минимум два класса",
        });
      }
    }

    if (classIdSet) {
      if (value.openClassIds.some((classId) => !classIdSet.has(classId))) {
        ctx.addIssue({
          code: "custom",
          path: ["openClassIds"],
          message: "Связанные строки должны быть целыми классами",
        });
      }

      if (value.coveredClassIds.some((classId) => !classIdSet.has(classId))) {
        ctx.addIssue({
          code: "custom",
          path: ["coveredClassIds"],
          message: "Связанные строки должны быть целыми классами",
        });
      }
    }

    const subject = context.subjectsById?.[value.subjectId];
    if (context.subjectsById && !subject) {
      ctx.addIssue({
        code: "custom",
        path: ["subjectId"],
        message: "Предмет не найден",
      });
    }

    if (subject) {
      if (value.deliveryMode === "DIRECT_GROUP" && subject.type === "ELECTIVE_OPTIONAL") {
        ctx.addIssue({
          code: "custom",
          path: ["subjectId"],
          message: "Доп по выбору должен создаваться через группу по выбору",
        });
      }

      if (value.deliveryMode === "ELECTIVE_GROUP" && subject.type !== "ELECTIVE_OPTIONAL") {
        ctx.addIssue({
          code: "custom",
          path: ["subjectId"],
          message: "Группа по выбору может использоваться только с предметом типа 'доп по выбору'",
        });
      }

      if (
        value.deliveryMode === "SHARED_CLASSES"
        && subject.type !== "ELECTIVE_REQUIRED"
        && subject.type !== "REGIME"
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["subjectId"],
          message: "Общими могут быть только обязательные допы и режимные предметы",
        });
      }
    }

    if (!value.deliveryGroupId) {
      return;
    }

    const group = context.groupsById?.[value.deliveryGroupId];
    if (context.groupsById && !group) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryGroupId"],
        message: "Группа не найдена",
      });
      return;
    }

    if (!group) {
      return;
    }

    if (value.deliveryMode === "DIRECT_GROUP" && group.type !== "CLASS" && group.type !== "SUBJECT_SUBGROUP") {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryGroupId"],
        message: "Для карточки этого типа нужна группа класса или подгруппы",
      });
    }

    if (value.deliveryMode === "ELECTIVE_GROUP") {
      if (group.type !== "ELECTIVE_GROUP") {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryGroupId"],
          message: "Для допа по выбору нужна группа по выбору",
        });
      }

      if (group.subjectId && group.subjectId !== value.subjectId) {
        ctx.addIssue({
          code: "custom",
          path: ["subjectId"],
          message: "Предмет карточки должен совпадать с предметом группы по выбору",
        });
      }
    }
  });
}

export const adminScheduleTemplateMutationSchema = createAdminScheduleTemplateMutationSchema();

export function getAdminScheduleTemplateValidationError(
  input: unknown,
  context?: AdminScheduleTemplateValidationContext,
) {
  const parsed = createAdminScheduleTemplateMutationSchema(context).safeParse(input);
  return parsed.success ? null : (parsed.error.issues[0]?.message ?? "Некорректные данные");
}

export type AdminScheduleTemplateMutationInput = z.infer<typeof adminScheduleTemplateMutationSchemaBase>;
export type { AdminScheduleTemplateValidationContext, ScheduleValidationGroup, ScheduleValidationSubject };
