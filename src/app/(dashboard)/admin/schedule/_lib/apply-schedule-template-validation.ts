import { adminScheduleTemplateInclude, mapWeeklyTemplateToAdminScheduleEvents, type AdminScheduleTemplateRecord } from "./admin-schedule-mapper";
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
  type: "CLASS" | "KINDERGARTEN_GROUP" | "SUBJECT_SUBGROUP" | "ELECTIVE_GROUP";
  subjectId: string | null;
  parentId: string | null;
  grade: number | null;
  _count: { studentGroups: number };
};

type ValidationSubjectRecord = {
  id: string;
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
    input.templates.flatMap((template) => mapWeeklyTemplateToAdminScheduleEvents(template)),
  );
  const hardConflictMessages = dedupeMessages(
    conflictAnalysis.hardConflicts.map((conflict) => conflict.message),
  );
  const errorMessages = dedupeMessages([
    ...(scheduledTemplates.length === 0 ? ["Недельный шаблон расписания пуст"] : []),
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
