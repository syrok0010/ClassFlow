import { z } from "zod";

import type { SubjectType } from "@/generated/prisma/enums";

import type {
  AdminScheduleClassRow,
  AdminScheduleElectiveGroupOption,
  AdminScheduleGroupOption,
  AdminScheduleRoomOption,
  AdminScheduleTeacherOption,
} from "./admin-schedule-types";
import {
  getAudienceSelection,
  getAvailableRoomOptions,
  getAvailableSubjectIds,
  getAvailableTeacherOptions,
  getDeliveryModeForCardKind,
  getDerivedEndMinutes,
  getDurationMinutes,
  getGroupOptionsByKind,
  getInitialCardKind,
  getStepError,
  SCHEDULE_EDITOR_STEPS,
  type ScheduleEditorSubjectOption,
  type ScheduleStepperFormValue,
} from "./schedule-editor-flow";
import {
  createAdminScheduleTemplateMutationSchema,
  type AdminScheduleTemplateMutationInput,
  type AdminScheduleTemplateValidationContext,
} from "./schedule-mutations-schema";

export type ScheduleEditorSubject = ScheduleEditorSubjectOption & { type: SubjectType };

export type ScheduleEditorDraft = {
  templateId?: string;
  dayOfWeek: number | null;
  startMinutes: number | null;
  endMinutes: number | null;
  subjectId: string;
  deliveryMode: ScheduleStepperFormValue["deliveryMode"];
  deliveryGroupId: string | null;
  roomId: string | null;
  teacherId: string | null;
  openClassIds: string[];
  coveredClassIds: string[];
};

export type ScheduleEditorFormContext = {
  subjectOptions: ScheduleEditorSubject[];
  classRows: AdminScheduleClassRow[];
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  roomOptions: AdminScheduleRoomOption[];
  teacherOptions: AdminScheduleTeacherOption[];
  lessonDurationByGroupSubject: Record<string, number>;
};

export function buildDefaultScheduleEditorValues({
  draft,
  context,
}: {
  draft: ScheduleEditorDraft | null;
  context: ScheduleEditorFormContext;
}) {
  const cardKind = getInitialCardKind(draft, context.directGroupOptions);
  const initialValue = normalizeScheduleEditorValue(
    {
      templateId: draft?.templateId,
      cardKind,
      deliveryMode: getDeliveryModeForCardKind(cardKind),
      deliveryGroupId: draft?.deliveryGroupId ?? null,
      openClassIds: draft?.openClassIds ?? [],
      coveredClassIds: draft?.coveredClassIds ?? [],
      subjectId: draft?.subjectId ?? "",
      roomId: draft?.roomId ?? null,
      teacherId: draft?.teacherId ?? null,
      dayOfWeek: draft?.dayOfWeek ?? null,
      startMinutes: draft?.startMinutes ?? null,
      endMinutes: draft?.endMinutes ?? null,
    },
    context,
  );

  const availableSubjectIds = getAvailableSubjectIds(
    initialValue,
    context.classRows,
    context.directGroupOptions,
    context.electiveGroupOptions,
  );

  if (!initialValue.subjectId && availableSubjectIds.length === 1) {
    return normalizeScheduleEditorValue(
      {
        ...initialValue,
        subjectId: availableSubjectIds[0],
      },
      context,
    );
  }

  return initialValue;
}

export function createScheduleEditorFormSchema(context: ScheduleEditorFormContext) {
  return z.object({
    templateId: z.string().optional(),
    cardKind: z.enum(["CLASS", "SUBGROUP", "ELECTIVE_GROUP", "SHARED_CLASSES"]),
    deliveryMode: z.enum(["DIRECT_GROUP", "ELECTIVE_GROUP", "SHARED_CLASSES"]),
    deliveryGroupId: z.string().nullable(),
    openClassIds: z.array(z.string().min(1)),
    coveredClassIds: z.array(z.string().min(1)),
    subjectId: z.string(),
    roomId: z.string().nullable(),
    teacherId: z.string().nullable(),
    dayOfWeek: z.number().int().min(1).max(5).nullable(),
    startMinutes: z.number().int().min(0).max(24 * 60 - 1).nullable(),
    endMinutes: z.number().int().min(1).max(24 * 60).nullable(),
  }).superRefine((value, ctx) => {
    if (value.deliveryMode !== getDeliveryModeForCardKind(value.cardKind)) {
      ctx.addIssue({
        code: "custom",
        path: ["cardKind"],
        message: "Тип карточки и режим доставки рассинхронизированы",
      });
    }

    const sharedValidation = createAdminScheduleTemplateMutationSchema(
      buildClientTemplateValidationContext(context),
    ).safeParse(toTemplateMutationInput(value));

    if (!sharedValidation.success) {
      for (const issue of sharedValidation.error.issues) {
        ctx.addIssue({
          code: "custom",
          path: [...issue.path],
          message: issue.message,
        });
      }
    }

    if (value.cardKind === "SHARED_CLASSES") {
      if (value.coveredClassIds.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["coveredClassIds"],
          message: "Нужно выбрать минимум два класса",
        });
      }
    } else if (!value.deliveryGroupId) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryGroupId"],
        message: "Выберите группу",
      });
    }

    const subjectIds = getAvailableSubjectIds(
      value,
      context.classRows,
      context.directGroupOptions,
      context.electiveGroupOptions,
    );

    if (subjectIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["subjectId"],
        message: "Для выбранной сущности нет доступных предметов",
      });
    } else if (!value.subjectId || !subjectIds.includes(value.subjectId)) {
      ctx.addIssue({
        code: "custom",
        path: ["subjectId"],
        message: "Выберите подходящий предмет",
      });
    }

    if (value.roomId) {
      const audienceSelection = getAudienceSelection(
        value,
        context.classRows,
        context.directGroupOptions,
        context.electiveGroupOptions,
      );
      const rooms = getAvailableRoomOptions(
        context.roomOptions,
        audienceSelection,
        context.subjectOptions.find((subject) => subject.id === value.subjectId) ?? null,
      );
      if (!rooms.some((room) => room.id === value.roomId)) {
        ctx.addIssue({
          code: "custom",
          path: ["roomId"],
          message: "Выбранный кабинет не подходит",
        });
      }
    }

    if (value.teacherId) {
      const audienceSelection = getAudienceSelection(
        value,
        context.classRows,
        context.directGroupOptions,
        context.electiveGroupOptions,
      );
      const teachers = getAvailableTeacherOptions(context.teacherOptions, audienceSelection, value.subjectId);
      if (!teachers.some((teacher) => teacher.id === value.teacherId)) {
        ctx.addIssue({
          code: "custom",
          path: ["teacherId"],
          message: "Выбранный учитель не подходит",
        });
      }
    }

    if (value.dayOfWeek === null) {
      if (value.startMinutes !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["startMinutes"],
          message: "Во временной области не нужно задавать время начала",
        });
      }
      return;
    }

    const durationMinutes = getDurationMinutes(value, context.lessonDurationByGroupSubject);
    if (durationMinutes === null) {
      ctx.addIssue({
        code: "custom",
        path: ["subjectId"],
        message: "Для выбранной комбинации не найдена длительность",
      });
      return;
    }

    if (value.startMinutes === null) {
      ctx.addIssue({
        code: "custom",
        path: ["startMinutes"],
        message: "Укажите время начала",
      });
      return;
    }

    const endMinutes = getDerivedEndMinutes(value.startMinutes, durationMinutes);
    if (endMinutes === null || value.endMinutes !== endMinutes) {
      ctx.addIssue({
        code: "custom",
        path: ["endMinutes"],
        message: "Время окончания рассчитано некорректно",
      });
      return;
    }

    if (endMinutes > 24 * 60) {
      ctx.addIssue({
        code: "custom",
        path: ["endMinutes"],
        message: "Время окончания выходит за пределы суток",
      });
    }
  });
}

export function getInitialScheduleEditorStepId(
  value: ScheduleStepperFormValue,
  context: Pick<
    ScheduleEditorFormContext,
    "classRows" | "directGroupOptions" | "electiveGroupOptions" | "lessonDurationByGroupSubject"
  >,
) {
  const firstInvalid = SCHEDULE_EDITOR_STEPS.find(
    (step) =>
      getStepError(
        step.id,
        value,
        context.classRows,
        context.directGroupOptions,
        context.electiveGroupOptions,
        context.lessonDurationByGroupSubject,
      ) !== null,
  );

  return firstInvalid?.id ?? "time";
}

export function normalizeScheduleEditorValue(
  value: ScheduleStepperFormValue,
  context: ScheduleEditorFormContext,
) {
  const classIdSet = new Set(context.classRows.map((row) => row.id));
  const availableGroups = getGroupOptionsByKind(
    value.cardKind,
    context.directGroupOptions,
    context.electiveGroupOptions,
  );
  const availableGroupIdSet = new Set(availableGroups.map((group) => group.id));
  const baseValue: ScheduleStepperFormValue = {
    ...value,
    deliveryMode: getDeliveryModeForCardKind(value.cardKind),
    deliveryGroupId: value.cardKind === "SHARED_CLASSES"
      ? null
      : value.deliveryGroupId && availableGroupIdSet.has(value.deliveryGroupId)
        ? value.deliveryGroupId
        : null,
    openClassIds: value.cardKind === "ELECTIVE_GROUP"
      ? value.openClassIds.filter((classId) => classIdSet.has(classId))
      : [],
    coveredClassIds: value.cardKind === "SHARED_CLASSES"
      ? value.coveredClassIds.filter((classId) => classIdSet.has(classId))
      : [],
  };
  const availableSubjectIds = getAvailableSubjectIds(
    baseValue,
    context.classRows,
    context.directGroupOptions,
    context.electiveGroupOptions,
  );
  const subjectId = availableSubjectIds.includes(baseValue.subjectId)
    ? baseValue.subjectId
    : availableSubjectIds.length === 1
      ? availableSubjectIds[0]
      : "";
  const normalizedValue = {
    ...baseValue,
    subjectId,
  } satisfies ScheduleStepperFormValue;
  const durationMinutes = getDurationMinutes(normalizedValue, context.lessonDurationByGroupSubject);
  const endMinutes = getDerivedEndMinutes(normalizedValue.startMinutes, durationMinutes);
  const audienceSelection = getAudienceSelection(
    normalizedValue,
    context.classRows,
    context.directGroupOptions,
    context.electiveGroupOptions,
  );
  const availableRooms = getAvailableRoomOptions(
    context.roomOptions,
    audienceSelection,
    context.subjectOptions.find((subject) => subject.id === subjectId) ?? null,
  );
  const availableTeachers = getAvailableTeacherOptions(context.teacherOptions, audienceSelection, subjectId);

  return {
    ...normalizedValue,
    dayOfWeek: normalizedValue.dayOfWeek,
    startMinutes: normalizedValue.dayOfWeek === null ? null : normalizedValue.startMinutes,
    endMinutes: normalizedValue.dayOfWeek === null ? null : endMinutes,
    roomId: normalizedValue.roomId && availableRooms.some((room) => room.id === normalizedValue.roomId)
      ? normalizedValue.roomId
      : null,
    teacherId: normalizedValue.teacherId && availableTeachers.some((teacher) => teacher.id === normalizedValue.teacherId)
      ? normalizedValue.teacherId
      : null,
  } satisfies ScheduleStepperFormValue;
}

export function minutesToTime(totalMinutes: number | null) {
  if (totalMinutes === null || Number.isNaN(totalMinutes)) {
    return "";
  }

  const safeMinutes = Math.max(0, Math.min(24 * 60, Math.round(totalMinutes)));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function toTemplateMutationInput(value: ScheduleStepperFormValue): AdminScheduleTemplateMutationInput {
  return {
    templateId: value.templateId,
    dayOfWeek: value.dayOfWeek,
    startMinutes: value.startMinutes,
    endMinutes: value.endMinutes,
    deliveryMode: value.deliveryMode,
    deliveryGroupId: value.deliveryGroupId,
    openClassIds: value.openClassIds,
    coveredClassIds: value.coveredClassIds,
    subjectId: value.subjectId,
    roomId: value.roomId,
    teacherId: value.teacherId,
  };
}

function buildClientTemplateValidationContext(
  context: ScheduleEditorFormContext,
): AdminScheduleTemplateValidationContext {
  return {
    subjectsById: Object.fromEntries(
      context.subjectOptions.map((subject) => [
        subject.id,
        {
          type: subject.type,
          defaultAttendanceLoadMode: subject.defaultAttendanceLoadMode,
        },
      ]),
    ),
    groupsById: Object.fromEntries([
      ...context.classRows.map((row) => [
        row.id,
        {
          type: "CLASS" as const,
          subjectId: null,
          studentCount: row.studentCount,
          parentId: null,
          grade: row.grade,
        },
      ]),
      ...context.directGroupOptions.map((group) => [
        group.id,
        {
          type: group.type,
          subjectId: group.subjectId,
          studentCount: group.studentCount,
          parentId: group.parentId,
          grade: group.grade,
        },
      ]),
      ...context.electiveGroupOptions.map((group) => [
        group.id,
        {
          type: "ELECTIVE_GROUP" as const,
          subjectId: group.subjectId,
          studentCount: group.studentCount,
          parentId: null,
          grade: null,
        },
      ]),
    ]),
    classIds: context.classRows.map((row) => row.id),
    lessonDurationByGroupSubject: context.lessonDurationByGroupSubject,
    roomById: Object.fromEntries(
      context.roomOptions.map((room) => [
        room.id,
        {
          seatsCount: room.seatsCount,
          subjectIds: room.subjectIds,
        },
      ]),
    ),
    teacherById: Object.fromEntries(
      context.teacherOptions.map((teacher) => [
        teacher.id,
        {
          subjects: teacher.subjects,
        },
      ]),
    ),
  };
}
