import type { AttendanceLoadMode, GroupType, SubjectType } from "@/generated/prisma/enums";
import { z } from "zod";

import { getExpectedScheduleAudienceSize } from "./schedule-load-policy";

type ScheduleValidationSubject = {
  type: SubjectType;
  defaultAttendanceLoadMode?: AttendanceLoadMode;
};

type ScheduleValidationGroup = {
  type: GroupType;
  subjectId: string | null;
  studentCount?: number;
  parentId?: string | null;
  grade?: number | null;
};

type AdminScheduleTemplateValidationContext = {
  subjectsById?: Record<string, ScheduleValidationSubject>;
  groupsById?: Record<string, ScheduleValidationGroup>;
  classIds?: readonly string[];
  lessonDurationByGroupSubject?: Record<string, number>;
  roomById?: Record<string, { seatsCount: number; subjectIds: readonly string[] }>;
  teacherById?: Record<string, { subjects: readonly { subjectId: string; minGrade: number | null; maxGrade: number | null }[] }>;
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

    const hasContextualAudience =
      context.lessonDurationByGroupSubject
      || context.roomById
      || context.teacherById;
    const audience = hasContextualAudience
      ? resolveValidationAudience(value, context)
      : null;

    if (context.lessonDurationByGroupSubject && audience) {
      const durations = audience.requirementGroupIds
        .map((groupId) => context.lessonDurationByGroupSubject?.[`${groupId}:${value.subjectId}`])
        .filter((duration): duration is number => typeof duration === "number");
      const uniqueDurations = Array.from(new Set(durations));

      if (durations.length !== audience.requirementGroupIds.length || uniqueDurations.length !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["subjectId"],
          message: "Для выбранной комбинации не найдена единая длительность занятия",
        });
      } else if (
        value.dayOfWeek !== null
        && value.startMinutes !== null
        && value.endMinutes !== value.startMinutes + uniqueDurations[0]
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["endMinutes"],
          message: "Время окончания должно соответствовать длительности из требований",
        });
      }
    }

    if (value.roomId && context.roomById && audience && subject) {
      const room = context.roomById[value.roomId];
      if (!room) {
        ctx.addIssue({
          code: "custom",
          path: ["roomId"],
          message: "Кабинет не найден",
        });
      } else if (!room.subjectIds.includes(value.subjectId)) {
        ctx.addIssue({
          code: "custom",
          path: ["roomId"],
          message: "В выбранном кабинете нельзя вести этот предмет",
        });
      } else if (
        room.seatsCount < getExpectedAudienceSize(
          audience,
          subject.defaultAttendanceLoadMode ?? "DELIVERY_GROUP_SIZE",
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["roomId"],
          message: "В выбранном кабинете не хватает мест",
        });
      }
    }

    if (value.teacherId && context.teacherById && audience) {
      const teacher = context.teacherById[value.teacherId];
      if (!teacher) {
        ctx.addIssue({
          code: "custom",
          path: ["teacherId"],
          message: "Учитель не найден",
        });
      } else if (!teacherCanTeachSubject(teacher, value.subjectId, audience.gradeRange)) {
        ctx.addIssue({
          code: "custom",
          path: ["teacherId"],
          message: "Выбранный учитель не ведет этот предмет для выбранной аудитории",
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

function resolveValidationAudience(
  value: AdminScheduleTemplateMutationInput,
  context: AdminScheduleTemplateValidationContext,
) {
  const groupsById = context.groupsById ?? {};

  if (value.deliveryMode === "SHARED_CLASSES") {
    const classes = value.coveredClassIds
      .map((classId) => groupsById[classId])
      .filter((group): group is ScheduleValidationGroup => Boolean(group));

    return {
      requirementGroupIds: value.coveredClassIds,
      deliveryGroupSize: classes.reduce((sum, group) => sum + (group.studentCount ?? 0), 0),
      fullClassSize: classes.reduce((sum, group) => sum + (group.studentCount ?? 0), 0),
      gradeRange: getGradeRange(classes.map((group) => group.grade ?? null)),
    };
  }

  if (!value.deliveryGroupId) {
    return null;
  }

  const group = groupsById[value.deliveryGroupId];
  if (!group) {
    return null;
  }

  if (value.deliveryMode === "ELECTIVE_GROUP") {
    return {
      requirementGroupIds: [value.deliveryGroupId],
      deliveryGroupSize: group.studentCount ?? 0,
      fullClassSize: group.studentCount ?? 0,
      gradeRange: { min: null, max: null },
    };
  }

  const parentClass = group.parentId ? groupsById[group.parentId] : null;

  return {
    requirementGroupIds: [value.deliveryGroupId],
    deliveryGroupSize: group.studentCount ?? 0,
    fullClassSize: parentClass?.studentCount ?? group.studentCount ?? 0,
    gradeRange: {
      min: group.grade ?? parentClass?.grade ?? null,
      max: group.grade ?? parentClass?.grade ?? null,
    },
  };
}

function getExpectedAudienceSize(
  audience: NonNullable<ReturnType<typeof resolveValidationAudience>>,
  loadMode: AttendanceLoadMode,
) {
  return getExpectedScheduleAudienceSize(audience, loadMode);
}

function teacherCanTeachSubject(
  teacher: { subjects: readonly { subjectId: string; minGrade: number | null; maxGrade: number | null }[] },
  subjectId: string,
  gradeRange: { min: number | null; max: number | null },
) {
  return teacher.subjects.some((subject) => {
    if (subject.subjectId !== subjectId) {
      return false;
    }

    if (gradeRange.min !== null && subject.minGrade !== null && gradeRange.min < subject.minGrade) {
      return false;
    }

    if (gradeRange.max !== null && subject.maxGrade !== null && gradeRange.max > subject.maxGrade) {
      return false;
    }

    return true;
  });
}

function getGradeRange(grades: Array<number | null>) {
  const actualGrades = grades.filter((grade): grade is number => typeof grade === "number");

  return {
    min: actualGrades.length > 0 ? Math.min(...actualGrades) : null,
    max: actualGrades.length > 0 ? Math.max(...actualGrades) : null,
  };
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
