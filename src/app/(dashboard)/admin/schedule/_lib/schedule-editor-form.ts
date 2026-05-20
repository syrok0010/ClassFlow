import { z } from "zod";

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
  SCHEDULE_EDITOR_STEPS,
  type ScheduleEditorStepId,
  type ScheduleEditorSubject,
  type ScheduleStepperFormValue,
} from "./schedule-editor-flow";
import {
  type AdminScheduleTemplateMutationInput,
  type AdminScheduleTemplateValidationContext,
  createAdminScheduleTemplateMutationSchema,
} from "./schedule-mutations-schema";

export type ScheduleEditorDraft = AdminScheduleTemplateMutationInput;

export type ScheduleEditorFormContext = {
  subjectOptions: ScheduleEditorSubject[];
  classRows: AdminScheduleClassRow[];
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  roomOptions: AdminScheduleRoomOption[];
  teacherOptions: AdminScheduleTeacherOption[];
  lessonDurationByGroupSubject: Record<string, number>;
};

export type ScheduleEditorDerivedState = {
  availableSubjectOptions: ScheduleEditorSubject[];
  availableRoomOptions: AdminScheduleRoomOption[];
  availableTeacherOptions: AdminScheduleTeacherOption[];
  durationMinutes: number | null;
  stepErrors: Record<ScheduleEditorStepId, string | null>;
  currentStepError: string | null;
  visibleCurrentStepError: string | null;
  currentStepIndex: number;
  canGoPrev: boolean;
  nextStepId: ScheduleEditorStepId | null;
  hasBlockingErrors: boolean;
};

export function buildDefaultScheduleEditorValues({
  draft,
  context,
}: {
  draft: ScheduleEditorDraft | null;
  context: ScheduleEditorFormContext;
}) {
  const cardKind = draft?.templateId
    ? getInitialCardKind(draft, context.directGroupOptions)
    : null;
  return normalizeScheduleEditorValue(
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
}

export function createScheduleEditorFormSchema(context: ScheduleEditorFormContext) {
  return z.object({
    templateId: z.string().optional(),
    cardKind: z.enum(["CLASS", "SUBGROUP", "ELECTIVE_GROUP", "SHARED_CLASSES"]).nullable(),
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
    if (value.cardKind === null) {
      ctx.addIssue({
        code: "custom",
        path: ["cardKind"],
        message: "Выберите тип карточки",
      });
    }

    if (value.cardKind !== null && value.deliveryMode !== getDeliveryModeForCardKind(value.cardKind)) {
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
    } else if (value.cardKind === null) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryGroupId"],
        message: "Сначала выберите тип карточки",
      });
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

    const audienceSelection = getAudienceSelection(
      value,
      context.classRows,
      context.directGroupOptions,
      context.electiveGroupOptions,
    );
    const selectedSubject = context.subjectOptions.find((subject) => subject.id === value.subjectId) ?? null;

    const rooms = getAvailableRoomOptions(
      context.roomOptions,
      selectedSubject,
    );

    if (value.subjectId) {
      if (rooms.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["roomId"],
          message: "Нет доступных кабинетов",
        });
      } else if (!value.roomId) {
        ctx.addIssue({
          code: "custom",
          path: ["roomId"],
          message: "Выберите кабинет",
        });
      } else if (!rooms.some((room) => room.id === value.roomId)) {
        ctx.addIssue({
          code: "custom",
          path: ["roomId"],
          message: "Выбранный кабинет не подходит",
        });
      }
    }

    const teachers = getAvailableTeacherOptions(context.teacherOptions, audienceSelection, value.subjectId);
    const isTeacherRequired = selectedSubject?.type !== "REGIME";

    if (value.subjectId) {
      if (!isTeacherRequired && !value.teacherId) {
        // For regime subjects, "teacher not selected" is valid even when no teachers are available.
      } else if (teachers.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["teacherId"],
          message: "Нет доступных учителей",
        });
      } else if (isTeacherRequired && !value.teacherId) {
        ctx.addIssue({
          code: "custom",
          path: ["teacherId"],
          message: "Выберите учителя",
        });
      } else if (value.teacherId && !teachers.some((teacher) => teacher.id === value.teacherId)) {
        ctx.addIssue({
          code: "custom",
          path: ["teacherId"],
          message: "Выбранный учитель не подходит",
        });
      }
    }

    if (value.startMinutes === null) {
      if (value.endMinutes !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["endMinutes"],
          message: "Во временной области не нужно задавать время окончания",
        });
      }
      return;
    }

    if (value.dayOfWeek === null) {
      ctx.addIssue({
        code: "custom",
        path: ["dayOfWeek"],
        message: "Выберите день",
      });
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
  context: ScheduleEditorFormContext,
) {
  const firstInvalid = SCHEDULE_EDITOR_STEPS.find(
    (step) => getScheduleEditorStepError(step.id, value, context) !== null,
  );

  return firstInvalid?.id ?? "time";
}

export function getScheduleEditorStepErrors(
  value: ScheduleStepperFormValue,
  context: ScheduleEditorFormContext,
) {
  return Object.fromEntries(
    SCHEDULE_EDITOR_STEPS.map((step) => [
      step.id,
      getScheduleEditorStepError(step.id, value, context),
    ]),
  ) as Record<ScheduleEditorStepId, string | null>;
}

export function buildScheduleEditorDerivedState({
  value,
  context,
  currentStepId,
  attemptedStepIds,
}: {
  value: ScheduleStepperFormValue;
  context: ScheduleEditorFormContext;
  currentStepId: ScheduleEditorStepId;
  attemptedStepIds: ReadonlySet<ScheduleEditorStepId>;
}): ScheduleEditorDerivedState {
  const audienceSelection = getAudienceSelection(
    value,
    context.classRows,
    context.directGroupOptions,
    context.electiveGroupOptions,
  );
  const availableSubjectIdSet = new Set(
    getAvailableSubjectIds(
      value,
      context.classRows,
      context.directGroupOptions,
      context.electiveGroupOptions,
    ),
  );
  const selectedSubject = context.subjectOptions.find((subject) => subject.id === value.subjectId) ?? null;
  const availableSubjectOptions = context.subjectOptions.filter((subject) => availableSubjectIdSet.has(subject.id));
  const availableRoomOptions = getAvailableRoomOptions(
    context.roomOptions,
    selectedSubject,
  );
  const availableTeacherOptions = getAvailableTeacherOptions(
    context.teacherOptions,
    audienceSelection,
    value.subjectId,
  );
  const durationMinutes = getDurationMinutes(value, context.lessonDurationByGroupSubject);
  const stepErrors = getScheduleEditorStepErrors(value, context);
  const currentStepIndex = Math.max(
    0,
    SCHEDULE_EDITOR_STEPS.findIndex((step) => step.id === currentStepId),
  );
  const currentStepError = stepErrors[currentStepId];

  return {
    availableSubjectOptions,
    availableRoomOptions,
    availableTeacherOptions,
    durationMinutes,
    stepErrors,
    currentStepError,
    visibleCurrentStepError:
      attemptedStepIds.has(currentStepId) || currentStepId === "time"
        ? currentStepError
        : null,
    currentStepIndex,
    canGoPrev: currentStepIndex > 0,
    nextStepId: SCHEDULE_EDITOR_STEPS[currentStepIndex + 1]?.id ?? null,
    hasBlockingErrors: Object.values(stepErrors).some((error) => error !== null),
  };
}

export function getScheduleEditorStepError(
  stepId: ScheduleEditorStepId,
  value: ScheduleStepperFormValue,
  context: ScheduleEditorFormContext,
) {
  const issues = getScheduleEditorIssues(value, context);
  const matchingIssue = issues.find((issue) => getScheduleEditorIssueStepId(issue) === stepId);
  return matchingIssue?.message ?? null;
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
  const subjectId = availableSubjectIds.includes(baseValue.subjectId) ? baseValue.subjectId : "";
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

export function toTemplateMutationInput(value: ScheduleStepperFormValue): AdminScheduleTemplateMutationInput {
  const isScheduled = value.startMinutes !== null && value.dayOfWeek !== null;

  return {
    templateId: value.templateId,
    dayOfWeek: isScheduled ? value.dayOfWeek : null,
    startMinutes: isScheduled ? value.startMinutes : null,
    endMinutes: isScheduled ? value.endMinutes : null,
    deliveryMode: value.deliveryMode,
    deliveryGroupId: value.deliveryGroupId,
    openClassIds: value.openClassIds,
    coveredClassIds: value.coveredClassIds,
    subjectId: value.subjectId,
    roomId: value.roomId,
    teacherId: value.teacherId,
  };
}

function getScheduleEditorIssues(
  value: ScheduleStepperFormValue,
  context: ScheduleEditorFormContext,
) {
  const parsed = createScheduleEditorFormSchema(context).safeParse(value);
  return parsed.success ? [] : parsed.error.issues;
}

function getScheduleEditorIssueStepId(
  issue: { path: PropertyKey[]; message: string },
): ScheduleEditorStepId | null {
  const field = issue.path[0];

  if (field === "cardKind" || field === "deliveryMode") {
    return "kind";
  }

  if (field === "deliveryGroupId" || field === "openClassIds" || field === "coveredClassIds") {
    return "audience";
  }

  if (field === "subjectId") {
    return issue.message.includes("длительность") ? "time" : "subject";
  }

  if (field === "roomId") {
    return "room";
  }

  if (field === "teacherId") {
    return "teacher";
  }

  if (field === "dayOfWeek" || field === "startMinutes" || field === "endMinutes") {
    return "time";
  }

  return null;
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
