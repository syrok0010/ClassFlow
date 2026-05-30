import assert from "node:assert/strict";
import test from "node:test";

import { validateApplyScheduleTemplateState } from "@/app/(dashboard)/admin/schedule/_lib/apply-schedule-template-validation";
import type { AdminScheduleTemplateRecord } from "@/app/(dashboard)/admin/schedule/_lib/admin-schedule-mapper";

type SubjectType = "ACADEMIC" | "ELECTIVE_REQUIRED" | "ELECTIVE_OPTIONAL" | "REGIME";
type DeliveryMode = "DIRECT_GROUP" | "ELECTIVE_GROUP" | "SHARED_CLASSES";

const CLASS_3A = makeClassRecord("class-3a", "3А", 24, 3);
const CLASS_3B = makeClassRecord("class-3b", "3Б", 25, 3);
const SUBGROUP_3A_MATH_1 = makeSubgroupRecord(
  "subgroup-3a-math-1",
  "3А / Математика 1",
  CLASS_3A,
  12,
  "subject-math",
);

test("reports empty weekly schedule template", () => {
  const result = validateApplyScheduleTemplateState({
    templates: [],
    subjects: [],
    groups: [],
    rooms: [],
    teachers: [],
    requirements: [],
  });

  assert.equal(result.isValid, false);
  assert.deepEqual(result.errorMessages, ["Недельный шаблон расписания пуст"]);
  assert.deepEqual(result.structuralErrorMessages, []);
  assert.deepEqual(result.hardConflictMessages, []);
});

test("accepts a valid direct class template", () => {
  const result = validateApplyScheduleTemplateState({
    templates: [
      makeDirectTemplate({
        id: "template-1",
        subject: makeSubject("subject-math", "Математика", "ACADEMIC"),
        deliveryGroup: makeDeliveryGroupFromClass(CLASS_3A),
        teacher: makeTeacher("teacher-1", "Иванов", "Иван"),
        room: makeRoom("room-101", "101", 30),
      }),
    ],
    subjects: [makeValidationSubject("subject-math", "Математика", "ACADEMIC")],
    groups: [CLASS_3A],
    rooms: [makeValidationRoom("room-101", 30, ["subject-math"])],
    teachers: [makeValidationTeacher("teacher-1", [{ subjectId: "subject-math", minGrade: 1, maxGrade: 4 }])],
    requirements: [makeRequirement("class-3a", "subject-math", 1, 45)],
  });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.errorMessages, []);
  assert.deepEqual(result.structuralErrorMessages, []);
  assert.deepEqual(result.hardConflictMessages, []);
});

test("reports weekly subject load mismatch for direct group templates", () => {
  const result = validateApplyScheduleTemplateState({
    templates: [
      makeDirectTemplate({
        id: "template-1",
        subject: makeSubject("subject-math", "Математика", "ACADEMIC"),
        deliveryGroup: makeDeliveryGroupFromClass(CLASS_3A),
        teacher: makeTeacher("teacher-1", "Иванов", "Иван"),
        room: makeRoom("room-101", "101", 30),
      }),
    ],
    subjects: [makeValidationSubject("subject-math", "Математика", "ACADEMIC")],
    groups: [CLASS_3A],
    rooms: [makeValidationRoom("room-101", 30, ["subject-math"])],
    teachers: [makeValidationTeacher("teacher-1", [{ subjectId: "subject-math", minGrade: 1, maxGrade: 4 }])],
    requirements: [makeRequirement("class-3a", "subject-math", 2, 45)],
  });

  assert.equal(result.isValid, false);
  assert.deepEqual(result.structuralErrorMessages, []);
  assert.deepEqual(result.hardConflictMessages, []);
  assert.deepEqual(result.errorMessages, [
    "Для группы 3А предмет Математика проставлен в шаблоне 1 раз(а) в неделю вместо 2.",
  ]);
});

test("ignores parent class weekly requirement when subgroup requirement exists for the same subject", () => {
  const result = validateApplyScheduleTemplateState({
    templates: [
      makeDirectTemplate({
        id: "template-1",
        subject: makeSubject("subject-math", "Математика", "ACADEMIC"),
        deliveryGroup: makeDeliveryGroupFromSubgroup(SUBGROUP_3A_MATH_1, CLASS_3A),
        teacher: makeTeacher("teacher-1", "Иванов", "Иван"),
        room: makeRoom("room-101", "101", 30),
      }),
    ],
    subjects: [makeValidationSubject("subject-math", "Математика", "ACADEMIC")],
    groups: [CLASS_3A, SUBGROUP_3A_MATH_1],
    rooms: [makeValidationRoom("room-101", 30, ["subject-math"])],
    teachers: [makeValidationTeacher("teacher-1", [{ subjectId: "subject-math", minGrade: 1, maxGrade: 4 }])],
    requirements: [
      makeRequirement("class-3a", "subject-math", 5, 45),
      makeRequirement("subgroup-3a-math-1", "subject-math", 1, 45),
    ],
  });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.errorMessages, []);
});

test("reports structural validation errors for invalid shared-classes template", () => {
  const result = validateApplyScheduleTemplateState({
    templates: [
      makeSharedTemplate({
        id: "template-1",
        subject: makeSubject("subject-lunch", "Обед", "REGIME"),
        coveredClasses: [CLASS_3A],
        room: makeRoom("room-cafeteria", "Столовая", 60),
      }),
    ],
    subjects: [makeValidationSubject("subject-lunch", "Обед", "REGIME")],
    groups: [CLASS_3A],
    rooms: [makeValidationRoom("room-cafeteria", 60, ["subject-lunch"])],
    teachers: [],
    requirements: [makeRequirement("class-3a", "subject-lunch", 1, 45)],
  });

  assert.equal(result.isValid, false);
  assert.deepEqual(result.hardConflictMessages, []);
  assert.deepEqual(result.structuralErrorMessages, [
    "Обед (3А): Общее занятие должно покрывать минимум два класса",
  ]);
  assert.deepEqual(result.errorMessages, result.structuralErrorMessages);
});

test("reports hard conflict messages from schedule conflict analysis", () => {
  const result = validateApplyScheduleTemplateState({
    templates: [
      makeDirectTemplate({
        id: "template-1",
        subject: makeSubject("subject-math", "Математика", "ACADEMIC"),
        deliveryGroup: makeDeliveryGroupFromClass(CLASS_3A),
        teacher: makeTeacher("teacher-1", "Иванов", "Иван"),
        room: makeRoom("room-101", "101", 30),
      }),
      makeDirectTemplate({
        id: "template-2",
        subject: makeSubject("subject-math", "Математика", "ACADEMIC"),
        deliveryGroup: makeDeliveryGroupFromClass(CLASS_3B),
        teacher: makeTeacher("teacher-1", "Иванов", "Иван"),
        room: makeRoom("room-102", "102", 30),
      }),
    ],
    subjects: [makeValidationSubject("subject-math", "Математика", "ACADEMIC")],
    groups: [CLASS_3A, CLASS_3B],
    rooms: [
      makeValidationRoom("room-101", 30, ["subject-math"]),
      makeValidationRoom("room-102", 30, ["subject-math"]),
    ],
    teachers: [makeValidationTeacher("teacher-1", [{ subjectId: "subject-math", minGrade: 1, maxGrade: 4 }])],
    requirements: [
      makeRequirement("class-3a", "subject-math", 1, 45),
      makeRequirement("class-3b", "subject-math", 1, 45),
    ],
  });

  assert.equal(result.isValid, false);
  assert.equal(result.structuralErrorMessages.length, 0);
  assert.equal(result.hardConflictMessages.length, 1);
  assert.match(result.hardConflictMessages[0], /Иванов/);
  assert.deepEqual(result.errorMessages, result.hardConflictMessages);
});

function makeClassRecord(id: string, name: string, studentCount: number, grade: number) {
  return {
    id,
    name,
    type: "CLASS" as const,
    subjectId: null,
    parentId: null,
    grade,
    _count: { studentGroups: studentCount },
  };
}

function makeSubgroupRecord(
  id: string,
  name: string,
  parentClass: ReturnType<typeof makeClassRecord>,
  studentCount: number,
  subjectId: string,
) {
  return {
    id,
    name,
    type: "SUBJECT_SUBGROUP" as const,
    subjectId,
    parentId: parentClass.id,
    grade: parentClass.grade,
    _count: { studentGroups: studentCount },
  };
}

function makeValidationSubject(id: string, name: string, type: SubjectType) {
  return {
    id,
    name,
    type,
    defaultAttendanceLoadMode: "DELIVERY_GROUP_SIZE" as const,
  };
}

function makeValidationRoom(id: string, seatsCount: number, subjectIds: string[]) {
  return {
    id,
    seatsCount,
    roomSubjects: subjectIds.map((subjectId) => ({ subjectId })),
  };
}

function makeValidationTeacher(
  id: string,
  subjects: Array<{ subjectId: string; minGrade: number | null; maxGrade: number | null }>,
) {
  return {
    id,
    teacherSubjects: subjects,
  };
}

function makeRequirement(groupId: string, subjectId: string, lessonsPerWeek: number, durationInMinutes: number) {
  return {
    groupId,
    subjectId,
    lessonsPerWeek,
    breakDuration: 0,
    durationInMinutes,
  };
}

function makeSubject(id: string, name: string, type: SubjectType) {
  return {
    id,
    name,
    type,
    defaultAttendanceLoadMode: "DELIVERY_GROUP_SIZE" as const,
  };
}

function makeTeacher(id: string, surname: string, name: string) {
  return {
    id,
    user: {
      surname,
      name,
      patronymicName: null,
    },
  };
}

function makeRoom(id: string, name: string, seatsCount: number) {
  return {
    id,
    name,
    seatsCount,
  };
}

function makeDeliveryGroupFromClass(group: ReturnType<typeof makeClassRecord>) {
  return {
    id: group.id,
    name: group.name,
    type: group.type,
    grade: group.grade,
    subjectId: group.subjectId,
    _count: group._count,
    parentGroup: null,
  };
}

function makeDeliveryGroupFromSubgroup(
  subgroup: ReturnType<typeof makeSubgroupRecord>,
  parentClass: ReturnType<typeof makeClassRecord>,
) {
  return {
    id: subgroup.id,
    name: subgroup.name,
    type: subgroup.type,
    grade: subgroup.grade,
    subjectId: subgroup.subjectId,
    _count: subgroup._count,
    parentGroup: {
      id: parentClass.id,
      name: parentClass.name,
      grade: parentClass.grade,
      type: parentClass.type,
      _count: parentClass._count,
    },
  };
}

function makeDirectTemplate(input: {
  id: string;
  subject: ReturnType<typeof makeSubject>;
  deliveryGroup: ReturnType<typeof makeDeliveryGroupFromClass> | ReturnType<typeof makeDeliveryGroupFromSubgroup>;
  teacher: ReturnType<typeof makeTeacher> | null;
  room: ReturnType<typeof makeRoom> | null;
  dayOfWeek?: number | null;
  startTime?: number | null;
  endTime?: number | null;
}) {
  return makeTemplateRecord({
    id: input.id,
    subject: input.subject,
    deliveryMode: "DIRECT_GROUP",
    deliveryGroup: input.deliveryGroup,
    teacher: input.teacher,
    room: input.room,
    dayOfWeek: input.dayOfWeek ?? 1,
    startTime: input.startTime ?? 480,
    endTime: input.endTime ?? 525,
  });
}

function makeSharedTemplate(input: {
  id: string;
  subject: ReturnType<typeof makeSubject>;
  coveredClasses: Array<ReturnType<typeof makeClassRecord>>;
  room: ReturnType<typeof makeRoom> | null;
  dayOfWeek?: number | null;
  startTime?: number | null;
  endTime?: number | null;
}) {
  return makeTemplateRecord({
    id: input.id,
    subject: input.subject,
    deliveryMode: "SHARED_CLASSES",
    deliveryGroup: null,
    teacher: null,
    room: input.room,
    coveredClasses: input.coveredClasses,
    dayOfWeek: input.dayOfWeek ?? 1,
    startTime: input.startTime ?? 720,
    endTime: input.endTime ?? 765,
  });
}

function makeTemplateRecord(input: {
  id: string;
  subject: ReturnType<typeof makeSubject>;
  deliveryMode: DeliveryMode;
  deliveryGroup: ReturnType<typeof makeDeliveryGroupFromClass> | ReturnType<typeof makeDeliveryGroupFromSubgroup> | null;
  teacher: ReturnType<typeof makeTeacher> | null;
  room: ReturnType<typeof makeRoom> | null;
  coveredClasses?: Array<ReturnType<typeof makeClassRecord>>;
  openClasses?: Array<ReturnType<typeof makeClassRecord>>;
  dayOfWeek: number | null;
  startTime: number | null;
  endTime: number | null;
}): AdminScheduleTemplateRecord {
  return {
    id: input.id,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    deliveryMode: input.deliveryMode,
    deliveryGroupId: input.deliveryGroup?.id ?? null,
    subjectId: input.subject.id,
    teacherId: input.teacher?.id ?? null,
    roomId: input.room?.id ?? null,
    attendanceLoadModeOverride: null,
    subject: input.subject,
    teacher: input.teacher,
    room: input.room,
    deliveryGroup: input.deliveryGroup,
    openClasses: (input.openClasses ?? []).map((schoolClass) => ({
      classGroupId: schoolClass.id,
      schoolClass,
    })),
    coveredClasses: (input.coveredClasses ?? []).map((schoolClass) => ({
      classGroupId: schoolClass.id,
      schoolClass,
    })),
  } as AdminScheduleTemplateRecord;
}
