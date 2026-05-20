import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeScheduleTemplateConflicts,
  type ScheduleConflictCode,
  type ScheduleConflictLinkedClass,
  type ScheduleConflictProjectionInput,
} from "@/app/(dashboard)/admin/schedule/_lib/schedule-conflicts";

const CLASS_3A = makeClass("class-3a", "3А", 24, 3);
const CLASS_3B = makeClass("class-3b", "3Б", 25, 3);
const CLASS_4A = makeClass("class-4a", "4А", 26, 4);

test("teacher overlap is a hard conflict", () => {
  const analysis = analyzeScheduleTemplateConflicts([
    makeDirectClassProjection({
      id: "event-1",
      templateId: "template-1",
      classInfo: CLASS_3A,
      teacherId: "teacher-1",
      teacherName: "Иванов",
      roomId: "room-101",
      roomName: "101",
    }),
    makeDirectClassProjection({
      id: "event-2",
      templateId: "template-2",
      classInfo: CLASS_3B,
      teacherId: "teacher-1",
      teacherName: "Иванов",
      roomId: "room-102",
      roomName: "102",
    }),
  ]);

  assert.equal(analysis.hasHardConflicts, true);
  assert.ok(hasConflictCode(analysis.hardConflicts, "TEACHER_TIME_OVERLAP"));
});

test("room overlap is a hard conflict", () => {
  const analysis = analyzeScheduleTemplateConflicts([
    makeDirectClassProjection({
      id: "event-1",
      templateId: "template-1",
      classInfo: CLASS_3A,
      teacherId: "teacher-1",
      roomId: "room-101",
      roomName: "101",
    }),
    makeDirectClassProjection({
      id: "event-2",
      templateId: "template-2",
      classInfo: CLASS_3B,
      teacherId: "teacher-2",
      teacherName: "Петров",
      roomId: "room-101",
      roomName: "101",
    }),
  ]);

  assert.equal(analysis.hasHardConflicts, true);
  assert.ok(hasConflictCode(analysis.hardConflicts, "ROOM_TIME_OVERLAP"));
});

test("whole-class direct overlap is a hard conflict", () => {
  const analysis = analyzeScheduleTemplateConflicts([
    makeDirectClassProjection({
      id: "event-1",
      templateId: "template-1",
      classInfo: CLASS_3A,
      subjectId: "subject-math",
      subjectName: "Математика",
      teacherId: "teacher-1",
      roomId: "room-101",
    }),
    makeDirectClassProjection({
      id: "event-2",
      templateId: "template-2",
      classInfo: CLASS_3A,
      subjectId: "subject-russian",
      subjectName: "Русский язык",
      teacherId: "teacher-2",
      teacherName: "Петров",
      roomId: "room-102",
      roomName: "102",
    }),
  ]);

  assert.ok(hasConflictCode(analysis.hardConflicts, "AUDIENCE_DIRECT_CLASS_OVERLAP"));
});

test("shared classes overlap is a hard conflict", () => {
  const analysis = analyzeScheduleTemplateConflicts([
    makeSharedProjection({
      id: "event-1a",
      templateId: "template-1",
      projectionClassId: CLASS_3A.id,
      coveredClasses: [CLASS_3A, CLASS_3B],
      teacherId: "teacher-1",
      roomId: "room-101",
      roomName: "101",
      subjectId: "subject-breakfast",
      subjectName: "Завтрак",
      subjectType: "REGIME",
      attendanceLoadMode: "FULL_CLASS_SIZE",
    }),
    makeSharedProjection({
      id: "event-2a",
      templateId: "template-2",
      projectionClassId: CLASS_3A.id,
      coveredClasses: [CLASS_3A, CLASS_4A],
      teacherId: "teacher-2",
      teacherName: "Петров",
      roomId: "room-102",
      roomName: "102",
      subjectId: "subject-lunch",
      subjectName: "Обед",
      subjectType: "REGIME",
      attendanceLoadMode: "FULL_CLASS_SIZE",
    }),
  ]);

  assert.ok(hasConflictCode(analysis.hardConflicts, "AUDIENCE_SHARED_CLASSES_OVERLAP"));
});

test("shared classes vs direct class overlap is a hard conflict", () => {
  const analysis = analyzeScheduleTemplateConflicts([
    makeSharedProjection({
      id: "event-1a",
      templateId: "template-1",
      projectionClassId: CLASS_3A.id,
      coveredClasses: [CLASS_3A, CLASS_3B],
      teacherId: "teacher-1",
      roomId: "room-101",
      roomName: "101",
      subjectId: "subject-breakfast",
      subjectName: "Завтрак",
      subjectType: "REGIME",
      attendanceLoadMode: "FULL_CLASS_SIZE",
    }),
    makeDirectClassProjection({
      id: "event-2",
      templateId: "template-2",
      classInfo: CLASS_3A,
      subjectId: "subject-math",
      subjectName: "Математика",
      teacherId: "teacher-2",
      teacherName: "Петров",
      roomId: "room-102",
      roomName: "102",
    }),
  ]);

  assert.ok(hasConflictCode(analysis.hardConflicts, "AUDIENCE_SHARED_DIRECT_CLASS_OVERLAP"));
});

test("optional cards opened for the same class do not create a hard conflict by openClassIds", () => {
  const analysis = analyzeScheduleTemplateConflicts([
    makeElectiveProjection({
      id: "event-1",
      templateId: "template-1",
      projectionClassId: CLASS_3A.id,
      deliveryGroupId: "elective-group-1",
      groupName: "Шахматы",
      openClasses: [CLASS_3A],
      teacherId: "teacher-1",
      roomId: "room-101",
      roomName: "101",
      subjectId: "subject-chess",
      subjectName: "Шахматы",
    }),
    makeElectiveProjection({
      id: "event-2",
      templateId: "template-2",
      projectionClassId: CLASS_3A.id,
      deliveryGroupId: "elective-group-2",
      groupName: "Театр",
      openClasses: [CLASS_3A],
      teacherId: "teacher-2",
      teacherName: "Петров",
      roomId: "room-102",
      roomName: "102",
      subjectId: "subject-theater",
      subjectName: "Театр",
    }),
  ]);

  assert.equal(analysis.hasHardConflicts, false);
  assert.equal(analysis.hardConflicts.length, 0);
});

test("academic and optional elective in the same class slot are a hard conflict", () => {
  const analysis = analyzeScheduleTemplateConflicts([
    makeDirectClassProjection({
      id: "event-1",
      templateId: "template-1",
      classInfo: CLASS_3A,
      subjectId: "subject-math",
      subjectName: "Математика",
      subjectType: "ACADEMIC",
      teacherId: "teacher-1",
      roomId: "room-101",
      roomName: "101",
    }),
    makeElectiveProjection({
      id: "event-2",
      templateId: "template-2",
      projectionClassId: CLASS_3A.id,
      deliveryGroupId: "elective-group-1",
      groupName: "Шахматы",
      openClasses: [CLASS_3A],
      subjectId: "subject-chess",
      subjectName: "Шахматы",
      subjectType: "ELECTIVE_OPTIONAL",
      teacherId: "teacher-2",
      teacherName: "Петров",
      roomId: "room-102",
      roomName: "102",
    }),
  ]);

  assert.ok(hasConflictCode(analysis.hardConflicts, "ACADEMIC_ELECTIVE_OVERLAP"));
});

test("subgroup vs whole class is a hard conflict", () => {
  const analysis = analyzeScheduleTemplateConflicts([
    makeSubgroupProjection({
      id: "event-1",
      templateId: "template-1",
      subgroupId: "subgroup-1",
      subgroupName: "3А / Английский 1",
      parentClass: CLASS_3A,
      deliveryGroupStudentCount: 12,
      teacherId: "teacher-1",
      roomId: "room-101",
      roomName: "101",
      subjectId: "subject-english",
      subjectName: "Английский",
    }),
    makeDirectClassProjection({
      id: "event-2",
      templateId: "template-2",
      classInfo: CLASS_3A,
      teacherId: "teacher-2",
      teacherName: "Петров",
      roomId: "room-102",
      roomName: "102",
      subjectId: "subject-music",
      subjectName: "Музыка",
    }),
  ]);

  assert.ok(hasConflictCode(analysis.hardConflicts, "AUDIENCE_SUBGROUP_PARENT_CLASS_OVERLAP"));
});

test("sibling subgroups are not a hard conflict", () => {
  const analysis = analyzeScheduleTemplateConflicts([
    makeSubgroupProjection({
      id: "event-1",
      templateId: "template-1",
      subgroupId: "subgroup-1",
      subgroupName: "3А / Английский 1",
      parentClass: CLASS_3A,
      deliveryGroupStudentCount: 12,
      teacherId: "teacher-1",
      roomId: "room-101",
      roomName: "101",
      subjectId: "subject-english",
      subjectName: "Английский",
    }),
    makeSubgroupProjection({
      id: "event-2",
      templateId: "template-2",
      subgroupId: "subgroup-2",
      subgroupName: "3А / Английский 2",
      parentClass: CLASS_3A,
      deliveryGroupStudentCount: 12,
      teacherId: "teacher-2",
      teacherName: "Петров",
      roomId: "room-102",
      roomName: "102",
      subjectId: "subject-english",
      subjectName: "Английский",
    }),
  ]);

  assert.equal(analysis.hasHardConflicts, false);
  assert.equal(analysis.hardConflicts.length, 0);
});

test("academic and required elective on sibling subgroups are a hard conflict", () => {
  const analysis = analyzeScheduleTemplateConflicts([
    makeSubgroupProjection({
      id: "event-1",
      templateId: "template-1",
      subgroupId: "subgroup-1",
      subgroupName: "3А / Математика 1",
      parentClass: CLASS_3A,
      deliveryGroupStudentCount: 12,
      subjectId: "subject-math",
      subjectName: "Математика",
      subjectType: "ACADEMIC",
      teacherId: "teacher-1",
      roomId: "room-101",
      roomName: "101",
    }),
    makeSubgroupProjection({
      id: "event-2",
      templateId: "template-2",
      subgroupId: "subgroup-2",
      subgroupName: "3А / Архитектура",
      parentClass: CLASS_3A,
      deliveryGroupStudentCount: 12,
      subjectId: "subject-arch",
      subjectName: "Архитектура",
      subjectType: "ELECTIVE_REQUIRED",
      teacherId: "teacher-2",
      teacherName: "Петров",
      roomId: "room-102",
      roomName: "102",
    }),
  ]);

  assert.ok(hasConflictCode(analysis.hardConflicts, "ACADEMIC_ELECTIVE_OVERLAP"));
});

test("room capacity overflow is a hard conflict", () => {
  const analysis = analyzeScheduleTemplateConflicts([
    makeSharedProjection({
      id: "event-1a",
      templateId: "template-1",
      projectionClassId: CLASS_3A.id,
      coveredClasses: [CLASS_3A, CLASS_3B],
      teacherId: "teacher-1",
      roomId: "room-cafeteria",
      roomName: "Столовая",
      roomSeatsCount: 40,
      subjectId: "subject-lunch",
      subjectName: "Обед",
      subjectType: "REGIME",
      attendanceLoadMode: "FULL_CLASS_SIZE",
    }),
  ]);

  assert.ok(hasConflictCode(analysis.hardConflicts, "ROOM_CAPACITY_OVERFLOW"));
});

test("the same template projected into multiple class rows does not conflict with itself", () => {
  const analysis = analyzeScheduleTemplateConflicts([
    makeSharedProjection({
      id: "event-1a",
      templateId: "template-1",
      projectionClassId: CLASS_3A.id,
      coveredClasses: [CLASS_3A, CLASS_3B],
      teacherId: "teacher-1",
      roomId: "room-101",
      roomName: "101",
      roomSeatsCount: 60,
      subjectId: "subject-lunch",
      subjectName: "Обед",
      subjectType: "REGIME",
      attendanceLoadMode: "FULL_CLASS_SIZE",
    }),
    makeSharedProjection({
      id: "event-1b",
      templateId: "template-1",
      projectionClassId: CLASS_3B.id,
      coveredClasses: [CLASS_3A, CLASS_3B],
      teacherId: "teacher-1",
      roomId: "room-101",
      roomName: "101",
      roomSeatsCount: 60,
      subjectId: "subject-lunch",
      subjectName: "Обед",
      subjectType: "REGIME",
      attendanceLoadMode: "FULL_CLASS_SIZE",
    }),
  ]);

  assert.equal(analysis.conflicts.length, 0);
});

test("multiple teachers for the same audience and subject warn on all related lessons", () => {
  const analysis = analyzeScheduleTemplateConflicts([
    makeDirectClassProjection({
      id: "event-1",
      templateId: "template-1",
      classInfo: CLASS_3A,
      startMinutes: 480,
      endMinutes: 525,
      teacherId: "teacher-1",
      teacherName: "Иванов",
      roomId: "room-101",
    }),
    makeDirectClassProjection({
      id: "event-2",
      templateId: "template-2",
      classInfo: CLASS_3A,
      startMinutes: 540,
      endMinutes: 585,
      teacherId: "teacher-1",
      teacherName: "Иванов",
      roomId: "room-102",
      roomName: "102",
    }),
    makeDirectClassProjection({
      id: "event-3",
      templateId: "template-3",
      classInfo: CLASS_3A,
      startMinutes: 600,
      endMinutes: 645,
      teacherId: "teacher-2",
      teacherName: "Петров",
      roomId: "room-103",
      roomName: "103",
    }),
  ]);

  const warnings = analysis.conflicts.filter((conflict) => conflict.code === "MULTIPLE_SUBJECT_TEACHERS_ASSIGNED");

  assert.equal(warnings.length, 3);
  assert.deepEqual(
    warnings.map((warning) => warning.affectedTemplateIds[0]).sort(),
    ["template-1", "template-2", "template-3"],
  );
  assert.ok(warnings.every((warning) => warning.severity === "warning"));
  assert.equal(analysis.hasHardConflicts, false);
});

function hasConflictCode(
  conflicts: readonly { code: ScheduleConflictCode }[],
  code: ScheduleConflictCode,
) {
  return conflicts.some((conflict) => conflict.code === code);
}

function makeClass(
  id: string,
  name: string,
  studentCount: number,
  grade: number,
): ScheduleConflictLinkedClass {
  return {
    id,
    name,
    grade,
    studentCount,
  };
}

function makeDirectClassProjection({
  id,
  templateId,
  classInfo,
  ...overrides
}: {
  id: string;
  templateId: string;
  classInfo: ScheduleConflictLinkedClass;
} & Partial<ScheduleConflictProjectionInput>) {
  return makeProjection({
    id,
    templateId,
    projectionClassId: classInfo.id,
    deliveryMode: "DIRECT_GROUP",
    deliveryGroupId: classInfo.id,
    deliveryGroupType: "CLASS",
    groupName: classInfo.name,
    deliveryGroupStudentCount: classInfo.studentCount,
    parentClassId: classInfo.id,
    parentClassName: classInfo.name,
    parentClassGrade: classInfo.grade,
    parentClassStudentCount: classInfo.studentCount,
    ...overrides,
  });
}

function makeSubgroupProjection({
  id,
  templateId,
  subgroupId,
  subgroupName,
  parentClass,
  deliveryGroupStudentCount,
  ...overrides
}: {
  id: string;
  templateId: string;
  subgroupId: string;
  subgroupName: string;
  parentClass: ScheduleConflictLinkedClass;
  deliveryGroupStudentCount: number;
} & Partial<ScheduleConflictProjectionInput>) {
  return makeProjection({
    id,
    templateId,
    projectionClassId: parentClass.id,
    deliveryMode: "DIRECT_GROUP",
    deliveryGroupId: subgroupId,
    deliveryGroupType: "SUBJECT_SUBGROUP",
    groupName: subgroupName,
    deliveryGroupStudentCount,
    parentClassId: parentClass.id,
    parentClassName: parentClass.name,
    parentClassGrade: parentClass.grade,
    parentClassStudentCount: parentClass.studentCount,
    ...overrides,
  });
}

function makeSharedProjection({
  id,
  templateId,
  projectionClassId,
  coveredClasses,
  ...overrides
}: {
  id: string;
  templateId: string;
  projectionClassId: string;
  coveredClasses: ScheduleConflictLinkedClass[];
} & Partial<ScheduleConflictProjectionInput>) {
  return makeProjection({
    id,
    templateId,
    projectionClassId,
    deliveryMode: "SHARED_CLASSES",
    deliveryGroupId: null,
    deliveryGroupType: null,
    groupName: coveredClasses.map((classInfo) => classInfo.name).join(" + "),
    coveredClassIds: coveredClasses.map((classInfo) => classInfo.id),
    coveredClasses,
    deliveryGroupStudentCount: null,
    parentClassId: null,
    parentClassName: null,
    parentClassGrade: null,
    parentClassStudentCount: null,
    ...overrides,
  });
}

function makeElectiveProjection({
  id,
  templateId,
  projectionClassId,
  deliveryGroupId,
  groupName,
  openClasses,
  ...overrides
}: {
  id: string;
  templateId: string;
  projectionClassId: string;
  deliveryGroupId: string;
  groupName: string;
  openClasses: ScheduleConflictLinkedClass[];
} & Partial<ScheduleConflictProjectionInput>) {
  return makeProjection({
    id,
    templateId,
    projectionClassId,
    deliveryMode: "ELECTIVE_GROUP",
    deliveryGroupId,
    deliveryGroupType: "ELECTIVE_GROUP",
    groupName,
    openClassIds: openClasses.map((classInfo) => classInfo.id),
    openClasses,
    deliveryGroupStudentCount: 10,
    parentClassId: null,
    parentClassName: null,
    parentClassGrade: null,
    parentClassStudentCount: null,
    ...overrides,
  });
}

function makeProjection(overrides: Partial<ScheduleConflictProjectionInput>): ScheduleConflictProjectionInput {
  return {
    id: overrides.id ?? "event",
    templateId: overrides.templateId ?? overrides.id ?? "template",
    projectionClassId: overrides.projectionClassId ?? CLASS_3A.id,
    deliveryMode: overrides.deliveryMode ?? "DIRECT_GROUP",
    deliveryGroupId: overrides.deliveryGroupId ?? CLASS_3A.id,
    deliveryGroupType: overrides.deliveryGroupType ?? "CLASS",
    openClassIds: overrides.openClassIds ?? [],
    coveredClassIds: overrides.coveredClassIds ?? [],
    openClasses: overrides.openClasses ?? [],
    coveredClasses: overrides.coveredClasses ?? [],
    dayOfWeek: overrides.dayOfWeek ?? 1,
    startMinutes: overrides.startMinutes ?? 480,
    endMinutes: overrides.endMinutes ?? 525,
    detached: overrides.detached ?? false,
    subjectId: overrides.subjectId ?? "subject-default",
    subjectName: overrides.subjectName ?? "Предмет",
    subjectType: overrides.subjectType ?? "ACADEMIC",
    attendanceLoadMode: overrides.attendanceLoadMode ?? "DELIVERY_GROUP_SIZE",
    teacherId: overrides.teacherId ?? "teacher-1",
    teacherName: overrides.teacherName ?? "Иванов",
    roomId: overrides.roomId ?? "room-101",
    roomName: overrides.roomName ?? "101",
    roomSeatsCount: overrides.roomSeatsCount ?? 50,
    groupName: overrides.groupName ?? CLASS_3A.name,
    deliveryGroupStudentCount: overrides.deliveryGroupStudentCount ?? CLASS_3A.studentCount,
    parentClassId: overrides.parentClassId ?? CLASS_3A.id,
    parentClassName: overrides.parentClassName ?? CLASS_3A.name,
    parentClassGrade: overrides.parentClassGrade ?? CLASS_3A.grade,
    parentClassStudentCount: overrides.parentClassStudentCount ?? CLASS_3A.studentCount,
  };
}
