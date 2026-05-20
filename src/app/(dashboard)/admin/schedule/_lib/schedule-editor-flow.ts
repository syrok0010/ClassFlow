import type { AttendanceLoadMode, GroupType, ScheduleDeliveryMode, SubjectType } from "@/generated/prisma/enums";

import type {
  AdminScheduleClassRow,
  AdminScheduleElectiveGroupOption,
  AdminScheduleGroupOption,
  AdminScheduleRoomOption,
  AdminScheduleTeacherOption,
} from "./admin-schedule-types";
import { getExpectedScheduleAudienceSize } from "./schedule-load-policy";
import type { AdminScheduleTemplateMutationInput } from "./schedule-mutations-schema";

export type ScheduleCardKind = "CLASS" | "SUBGROUP" | "ELECTIVE_GROUP" | "SHARED_CLASSES";

export type ScheduleEditorStepId =
  | "kind"
  | "audience"
  | "subject"
  | "room"
  | "teacher"
  | "time";

export type ScheduleEditorStep = {
  id: ScheduleEditorStepId;
  title: string;
  description: string;
};

export type ScheduleStepperFormValue = AdminScheduleTemplateMutationInput & {
  cardKind: ScheduleCardKind | null;
};

type AudienceSelection = {
  gradeRange: { min: number | null; max: number | null };
  deliveryGroupSize: number;
  fullClassSize: number;
  subjectIds: string[];
};

export type ScheduleEditorSubject = {
  id: string;
  name: string;
  type: SubjectType;
  defaultAttendanceLoadMode: AttendanceLoadMode;
};

export const SCHEDULE_EDITOR_STEPS: ScheduleEditorStep[] = [
  {
    id: "kind",
    title: "Тип карточки",
    description: "Выберите, кого описывает карточка расписания.",
  },
  {
    id: "audience",
    title: "Состав",
    description: "Выберите класс, подгруппу, группу по выбору или набор классов.",
  },
  {
    id: "subject",
    title: "Предмет",
    description: "Доступны только предметы, которые реально закреплены за выбранной сущностью.",
  },
  {
    id: "room",
    title: "Кабинет",
    description: "Показываются только кабинеты для предмета и достаточной вместимости.",
  },
  {
    id: "teacher",
    title: "Учитель",
    description: "Показываются только учителя, которые ведут выбранный предмет.",
  },
  {
    id: "time",
    title: "Время",
    description: "Выберите день недели и время начала. Конец посчитается автоматически.",
  },
];

export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  CLASS: "Класс",
  KINDERGARTEN_GROUP: "Группа",
  SUBJECT_SUBGROUP: "Подгруппа",
  ELECTIVE_GROUP: "Группа по выбору",
};

export const CARD_KIND_LABELS: Record<ScheduleCardKind, string> = {
  CLASS: "Класс",
  SUBGROUP: "Подгруппа",
  ELECTIVE_GROUP: "Группа по выбору",
  SHARED_CLASSES: "Объединенная группа",
};

export function getInitialCardKind(
  draft: Pick<AdminScheduleTemplateMutationInput, "deliveryMode" | "deliveryGroupId"> | null,
  directGroupOptions: AdminScheduleGroupOption[],
): ScheduleCardKind {
  if (!draft) {
    return "CLASS";
  }

  if (draft.deliveryMode === "ELECTIVE_GROUP") {
    return "ELECTIVE_GROUP";
  }

  if (draft.deliveryMode === "SHARED_CLASSES") {
    return "SHARED_CLASSES";
  }

  const group = directGroupOptions.find((option) => option.id === draft.deliveryGroupId);
  return group?.type === "SUBJECT_SUBGROUP" ? "SUBGROUP" : "CLASS";
}

export function getDeliveryModeForCardKind(kind: ScheduleCardKind | null): ScheduleDeliveryMode {
  if (kind === "ELECTIVE_GROUP") {
    return "ELECTIVE_GROUP";
  }

  if (kind === "SHARED_CLASSES") {
    return "SHARED_CLASSES";
  }

  return "DIRECT_GROUP";
}

export function getGroupOptionsByKind(
  cardKind: ScheduleCardKind | null,
  directGroupOptions: AdminScheduleGroupOption[],
  electiveGroupOptions: AdminScheduleElectiveGroupOption[],
) {
  if (!cardKind) {
    return [];
  }

  if (cardKind === "CLASS") {
    return directGroupOptions.filter((option) => option.type === "CLASS");
  }

  if (cardKind === "SUBGROUP") {
    return directGroupOptions.filter((option) => option.type === "SUBJECT_SUBGROUP");
  }

  if (cardKind === "ELECTIVE_GROUP") {
    return electiveGroupOptions;
  }

  return [];
}

export function getAudienceSelection(
  value: Pick<ScheduleStepperFormValue, "cardKind" | "deliveryGroupId" | "coveredClassIds">,
  classRows: AdminScheduleClassRow[],
  directGroupOptions: AdminScheduleGroupOption[],
  electiveGroupOptions: AdminScheduleElectiveGroupOption[],
): AudienceSelection | null {
  if (!value.cardKind) {
    return null;
  }

  if (value.cardKind === "SHARED_CLASSES") {
    if (value.coveredClassIds.length === 0) {
      return null;
    }

    const classes = classRows.filter((row) => value.coveredClassIds.includes(row.id));
    if (classes.length === 0) {
      return null;
    }

    const subjectIds = intersectSubjectIds(classes.map((item) => item.subjectIds));
    return {
      gradeRange: {
        min: getMinNumber(classes.map((item) => item.grade)),
        max: getMaxNumber(classes.map((item) => item.grade)),
      },
      deliveryGroupSize: classes.reduce((sum, item) => sum + item.studentCount, 0),
      fullClassSize: classes.reduce((sum, item) => sum + item.studentCount, 0),
      subjectIds,
    };
  }

  if (!value.deliveryGroupId) {
    return null;
  }

  if (value.cardKind === "ELECTIVE_GROUP") {
    const group = electiveGroupOptions.find((option) => option.id === value.deliveryGroupId);
    if (!group) {
      return null;
    }

    return {
      gradeRange: { min: null, max: null },
      deliveryGroupSize: group.studentCount,
      fullClassSize: group.studentCount,
      subjectIds: group.subjectIds,
    };
  }

  const group = directGroupOptions.find((option) => option.id === value.deliveryGroupId);
  if (!group) {
    return null;
  }

  const parentClass = group.type === "SUBJECT_SUBGROUP"
    ? classRows.find((row) => row.id === group.parentId)
    : classRows.find((row) => row.id === group.id);
  const grade = group.grade ?? parentClass?.grade ?? null;

  return {
    gradeRange: { min: grade, max: grade },
    deliveryGroupSize: group.studentCount,
    fullClassSize: parentClass?.studentCount ?? group.studentCount,
    subjectIds: group.subjectIds,
  };
}

export function getAvailableSubjectIds(
  value: Pick<ScheduleStepperFormValue, "cardKind" | "deliveryGroupId" | "coveredClassIds">,
  classRows: AdminScheduleClassRow[],
  directGroupOptions: AdminScheduleGroupOption[],
  electiveGroupOptions: AdminScheduleElectiveGroupOption[],
) {
  return getAudienceSelection(value, classRows, directGroupOptions, electiveGroupOptions)?.subjectIds ?? [];
}

export function getAvailableRoomOptions(
  roomOptions: AdminScheduleRoomOption[],
  audienceSelection: AudienceSelection | null,
  subject: Pick<ScheduleEditorSubject, "id" | "defaultAttendanceLoadMode"> | null,
) {
  if (!audienceSelection || !subject) {
    return [] as AdminScheduleRoomOption[];
  }

  const expectedSize = getExpectedScheduleAudienceSize(
    audienceSelection,
    subject.defaultAttendanceLoadMode,
  );

  return roomOptions.filter(
    (room) => room.subjectIds.includes(subject.id) && room.seatsCount >= expectedSize,
  );
}

export function getAvailableTeacherOptions(
  teacherOptions: AdminScheduleTeacherOption[],
  audienceSelection: AudienceSelection | null,
  subjectId: string,
) {
  if (!subjectId) {
    return [] as AdminScheduleTeacherOption[];
  }

  return teacherOptions.filter((teacher) =>
    teacher.subjects.some((subject) => {
      if (subject.subjectId !== subjectId) {
        return false;
      }

      if (!audienceSelection) {
        return true;
      }

      const minGrade = audienceSelection.gradeRange.min;
      const maxGrade = audienceSelection.gradeRange.max;
      const subjectMin = subject.minGrade;
      const subjectMax = subject.maxGrade;

      if (minGrade !== null && subjectMin !== null && minGrade < subjectMin) {
        return false;
      }

      if (maxGrade !== null && subjectMax !== null && maxGrade > subjectMax) {
        return false;
      }

      return true;
    }),
  );
}

export function getDurationMinutes(
  value: Pick<ScheduleStepperFormValue, "cardKind" | "deliveryGroupId" | "coveredClassIds" | "subjectId">,
  lessonDurationByGroupSubject: Record<string, number>,
) {
  if (!value.subjectId) {
    return null;
  }

  if (value.cardKind === "SHARED_CLASSES") {
    const durations = Array.from(
      new Set(
        value.coveredClassIds
          .map((classId) => lessonDurationByGroupSubject[`${classId}:${value.subjectId}`])
          .filter((duration): duration is number => typeof duration === "number"),
      ),
    );

    if (durations.length !== 1) {
      return null;
    }

    return durations[0];
  }

  if (!value.deliveryGroupId) {
    return null;
  }

  return lessonDurationByGroupSubject[`${value.deliveryGroupId}:${value.subjectId}`] ?? null;
}

export function getDerivedEndMinutes(startMinutes: number | null, durationMinutes: number | null) {
  if (startMinutes === null || durationMinutes === null) {
    return null;
  }

  return startMinutes + durationMinutes;
}

export function getAudienceSummaryLabel(
  value: Pick<ScheduleStepperFormValue, "cardKind" | "deliveryGroupId" | "coveredClassIds">,
  classRows: AdminScheduleClassRow[],
  directGroupOptions: AdminScheduleGroupOption[],
  electiveGroupOptions: AdminScheduleElectiveGroupOption[],
) {
  if (value.cardKind === "SHARED_CLASSES") {
    return classRows
      .filter((row) => value.coveredClassIds.includes(row.id))
      .map((row) => row.name)
      .join(", ");
  }

  if (!value.deliveryGroupId) {
    return null;
  }

  if (value.cardKind === "ELECTIVE_GROUP") {
    return electiveGroupOptions.find((option) => option.id === value.deliveryGroupId)?.name ?? null;
  }

  return directGroupOptions.find((option) => option.id === value.deliveryGroupId)?.name ?? null;
}

function intersectSubjectIds(subjectLists: string[][]) {
  if (subjectLists.length === 0) {
    return [];
  }

  return [...new Set(subjectLists[0])].filter((subjectId) =>
    subjectLists.every((subjectIds) => subjectIds.includes(subjectId)),
  );
}

function getMinNumber(values: Array<number | null>) {
  const numbers = values.filter((value): value is number => typeof value === "number");
  return numbers.length > 0 ? Math.min(...numbers) : null;
}

function getMaxNumber(values: Array<number | null>) {
  const numbers = values.filter((value): value is number => typeof value === "number");
  return numbers.length > 0 ? Math.max(...numbers) : null;
}
