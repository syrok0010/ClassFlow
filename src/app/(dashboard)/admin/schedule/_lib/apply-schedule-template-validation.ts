import {
  adminScheduleTemplateInclude,
  mapWeeklyTemplateToAdminScheduleEvents,
  type AdminScheduleTemplateRecord,
  type RequirementMeta,
} from "./admin-schedule-mapper";
import { validateScheduleTemplateRollout } from "./schedule-conflicts";
import {
  createAdminScheduleTemplateMutationSchema,
  type AdminScheduleTemplateMutationInput,
} from "./schedule-mutations-schema";
import { buildLessonDurationByGroupSubject } from "./schedule-duration-map";

export interface ApplyScheduleTemplateValidationResult {
  isValid: boolean;
  errorMessages: string[];
  structuralErrorMessages: string[];
  hardConflictMessages: string[];
}

type ValidationGroupRecord = {
  id: string;
  name: string;
  type: "CLASS" | "KINDERGARTEN_GROUP" | "SUBJECT_SUBGROUP" | "ELECTIVE_GROUP";
  subjectId: string | null;
  parentId: string | null;
  grade: number | null;
  _count: { studentGroups: number };
};

type ValidationSubjectRecord = {
  id: string;
  name: string;
  type: "ACADEMIC" | "ELECTIVE_REQUIRED" | "ELECTIVE_OPTIONAL" | "REGIME";
  defaultAttendanceLoadMode:
    | "DELIVERY_GROUP_SIZE"
    | "FULL_CLASS_SIZE"
    | "AFTERSCHOOL_COEFFICIENT";
};

type ValidationRoomRecord = {
  id: string;
  seatsCount: number;
  roomSubjects: Array<{ subjectId: string }>;
};

type ValidationTeacherRecord = {
  id: string;
  teacherSubjects: Array<{
    subjectId: string;
    minGrade: number | null;
    maxGrade: number | null;
  }>;
};

type ValidationRequirementRecord = {
  groupId: string;
  subjectId: string;
  lessonsPerWeek: number;
  breakDuration: number;
  durationInMinutes: number;
};

export const applyScheduleTemplateValidationInclude = adminScheduleTemplateInclude;

export function validateApplyScheduleTemplateState(input: {
  templates: AdminScheduleTemplateRecord[];
  subjects: ValidationSubjectRecord[];
  groups: ValidationGroupRecord[];
  rooms: ValidationRoomRecord[];
  teachers: ValidationTeacherRecord[];
  requirements: ValidationRequirementRecord[];
}): ApplyScheduleTemplateValidationResult {
  const scheduledTemplates = input.templates.filter(
    (template) =>
      template.dayOfWeek !== null && template.startTime !== null && template.endTime !== null,
  );
  const lessonDurationByGroupSubject = buildLessonDurationByGroupSubject(
    input.requirements,
    input.templates,
  );
  const requirementMetaByGroupSubject: Record<string, RequirementMeta> = Object.fromEntries(
    input.requirements.map((requirement) => [
      `${requirement.groupId}:${requirement.subjectId}`,
      {
        lessonsPerWeek: requirement.lessonsPerWeek,
        breakDuration: requirement.breakDuration,
      },
    ]),
  );
  const weeklyLoadErrorMessages = validateWeeklySubjectLoad({
    templates: scheduledTemplates,
    groups: input.groups,
    requirements: input.requirements,
    subjects: input.subjects,
  });
  const structuralSchema = createAdminScheduleTemplateMutationSchema({
    subjectsById: Object.fromEntries(
      input.subjects.map((subject) => [
        subject.id,
        {
          type: subject.type,
          defaultAttendanceLoadMode: subject.defaultAttendanceLoadMode,
        },
      ]),
    ),
    groupsById: Object.fromEntries(
      input.groups.map((group) => [
        group.id,
        {
          type: group.type,
          subjectId: group.subjectId,
          studentCount: group._count.studentGroups,
          parentId: group.parentId,
          grade: group.grade,
        },
      ]),
    ),
    classIds: input.groups
      .filter((group) => group.type === "CLASS")
      .map((group) => group.id),
    lessonDurationByGroupSubject,
    roomById: Object.fromEntries(
      input.rooms.map((room) => [
        room.id,
        {
          seatsCount: room.seatsCount,
          subjectIds: room.roomSubjects.map((item) => item.subjectId),
        },
      ]),
    ),
    teacherById: Object.fromEntries(
      input.teachers.map((teacher) => [
        teacher.id,
        {
          subjects: teacher.teacherSubjects,
        },
      ]),
    ),
  });

  const structuralErrorMessages = dedupeMessages(
    input.templates.flatMap((template) => {
      const parsed = structuralSchema.safeParse(buildTemplateDraft(template));

      if (parsed.success) {
        return [];
      }

      return [
        `${formatTemplateLabel(template)}: ${parsed.error.issues[0]?.message ?? "Некорректные данные шаблона"}`,
      ];
    }),
  );
  const conflictAnalysis = validateScheduleTemplateRollout(
    input.templates.flatMap((template) =>
      mapWeeklyTemplateToAdminScheduleEvents(template, requirementMetaByGroupSubject)
    ),
  );
  const hardConflictMessages = dedupeMessages(
    conflictAnalysis.hardConflicts.map((conflict) => conflict.message),
  );
  const errorMessages = dedupeMessages([
    ...(scheduledTemplates.length === 0 ? ["Недельный шаблон расписания пуст"] : []),
    ...weeklyLoadErrorMessages,
    ...structuralErrorMessages,
    ...hardConflictMessages,
  ]);

  return {
    isValid: errorMessages.length === 0,
    errorMessages,
    structuralErrorMessages,
    hardConflictMessages,
  };
}

function validateWeeklySubjectLoad(input: {
  templates: AdminScheduleTemplateRecord[];
  groups: ValidationGroupRecord[];
  requirements: ValidationRequirementRecord[];
  subjects: ValidationSubjectRecord[];
}) {
  const groupsById = new Map(input.groups.map((group) => [group.id, group]));
  const groupNameById = new Map(input.groups.map((group) => [group.id, group.name]));
  const subjectNameById = new Map(input.subjects.map((subject) => [subject.id, subject.name]));
  const subgroupRequirementKeys = new Set(
    input.requirements.flatMap((requirement) => {
      const group = groupsById.get(requirement.groupId);

      return group?.type === "SUBJECT_SUBGROUP" && group.parentId
        ? [`${group.parentId}:${requirement.subjectId}`]
        : [];
    }),
  );
  const expectedLessonsByGroupSubject = new Map<string, number>(
    input.requirements.flatMap((requirement) => {
      const group = groupsById.get(requirement.groupId);

      if (
        group?.type === "CLASS"
        && subgroupRequirementKeys.has(`${group.id}:${requirement.subjectId}`)
      ) {
        return [];
      }

      return [[`${requirement.groupId}:${requirement.subjectId}`, requirement.lessonsPerWeek] as const];
    }),
  );
  const scheduledLessonsByGroupSubject = new Map<string, number>();

  for (const template of input.templates) {
    const requirementGroupIds = template.deliveryMode === "SHARED_CLASSES"
      ? template.coveredClasses.map((item) => item.classGroupId)
      : template.deliveryGroupId
        ? [template.deliveryGroupId]
        : [];

    for (const groupId of requirementGroupIds) {
      const key = `${groupId}:${template.subjectId}`;
      scheduledLessonsByGroupSubject.set(key, (scheduledLessonsByGroupSubject.get(key) ?? 0) + 1);
    }
  }

  const groupSubjectKeys = new Set([
    ...expectedLessonsByGroupSubject.keys(),
    ...scheduledLessonsByGroupSubject.keys(),
  ]);

  return dedupeMessages(
    Array.from(groupSubjectKeys).flatMap((key) => {
      const expectedLessons = expectedLessonsByGroupSubject.get(key) ?? 0;
      const actualLessons = scheduledLessonsByGroupSubject.get(key) ?? 0;

      if (actualLessons === expectedLessons) {
        return [];
      }

      const separatorIndex = key.indexOf(":");
      const groupId = key.slice(0, separatorIndex);
      const subjectId = key.slice(separatorIndex + 1);

      const groupName = groupNameById.get(groupId) ?? "Неизвестная группа";
      const subjectName = subjectNameById.get(subjectId) ?? "Без названия";

      return [
        `Для группы ${groupName} предмет ${subjectName} ` +
          `проставлен в шаблоне ${actualLessons} раз(а) в неделю вместо ${expectedLessons}.`,
      ];
    }),
  );
}

function buildTemplateDraft(
  template: AdminScheduleTemplateRecord,
): AdminScheduleTemplateMutationInput {
  return {
    templateId: template.id,
    dayOfWeek: template.dayOfWeek,
    startMinutes: template.startTime,
    endMinutes: template.endTime,
    deliveryMode: template.deliveryMode,
    deliveryGroupId: template.deliveryGroupId,
    openClassIds: template.openClasses.map((item) => item.classGroupId),
    coveredClassIds: template.coveredClasses.map((item) => item.classGroupId),
    subjectId: template.subjectId,
    roomId: template.roomId,
    teacherId: template.teacherId,
  };
}

function formatTemplateLabel(template: AdminScheduleTemplateRecord) {
  if (template.deliveryMode === "SHARED_CLASSES") {
    const classNames = template.coveredClasses
      .map((item) => item.schoolClass.name)
      .sort((left, right) => left.localeCompare(right, "ru"));

    return `${template.subject.name} (${classNames.join(" + ") || "Общее занятие"})`;
  }

  return `${template.subject.name} (${template.deliveryGroup?.name ?? "Группа не указана"})`;
}

function dedupeMessages(messages: string[]) {
  return Array.from(new Set(messages));
}
