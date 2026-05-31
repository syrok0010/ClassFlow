import assert from "node:assert/strict";
import test from "node:test";

import {
  mapScheduleProjectionSourceToAdminEvents,
  type ScheduleProjectionGroup,
  type ScheduleProjectionLinkedClass,
  type ScheduleProjectionSource,
} from "@/app/(dashboard)/admin/schedule/_lib/schedule-projection-mapper";

const CLASS_3A = makeClass("class-3a", "3А", 24, 3);
const CLASS_3B = makeClass("class-3b", "3Б", 25, 3);

test("direct subject subgroup projects onto parent class but keeps subgroup identity", () => {
  const subgroup: ScheduleProjectionGroup = {
    ...makeClass("subgroup-3a-math-1", "3А / Математика 1", 12, 3),
    type: "SUBJECT_SUBGROUP",
    subjectId: "subject-math",
    parentGroup: CLASS_3A,
  };

  const [event] = mapScheduleProjectionSourceToAdminEvents(
    makeSource({
      deliveryGroup: subgroup,
      subjectId: "subject-math",
      subjectName: "Математика",
    }),
    {
      "class-3a:subject-math": {
        lessonsPerWeek: 2,
        breakDuration: 10,
      },
    },
  );

  assert.equal(event.classId, "class-3a");
  assert.equal(event.className, "3А");
  assert.equal(event.groupName, "3А / Математика 1");
  assert.equal(event.groupType, "SUBJECT_SUBGROUP");
  assert.equal(event.deliveryGroupId, "subgroup-3a-math-1");
  assert.equal(event.deliveryGroupStudentCount, 12);
  assert.equal(event.parentClassId, "class-3a");
  assert.equal(event.parentClassStudentCount, 24);
  assert.equal(event.minimumBreakAfterMinutes, 10);
});

test("elective group creates one projection per opened class", () => {
  const events = mapScheduleProjectionSourceToAdminEvents(
    makeSource({
      deliveryMode: "ELECTIVE_GROUP",
      deliveryGroup: {
        ...makeClass("elective-chess", "Шахматы", 8, null),
        type: "ELECTIVE_GROUP",
        subjectId: "subject-chess",
        parentGroup: null,
      },
      openClasses: [CLASS_3B, CLASS_3A],
      subjectId: "subject-chess",
      subjectName: "Шахматы",
      subjectType: "ELECTIVE_OPTIONAL",
      attendanceLoadMode: "AFTERSCHOOL_COEFFICIENT",
    }),
    {
      "elective-chess:subject-chess": {
        lessonsPerWeek: 1,
        breakDuration: 5,
      },
    },
  );

  assert.deepEqual(events.map((event) => event.classId), ["class-3a", "class-3b"]);
  assert.deepEqual(events[0].openClassIds, ["class-3a", "class-3b"]);
  assert.equal(events[0].groupName, "Шахматы");
  assert.equal(events[0].deliveryGroupId, "elective-chess");
  assert.equal(events[0].minimumBreakAfterMinutes, 5);
  assert.equal(events[1].minimumBreakAfterMinutes, 5);
});

test("shared classes use per-class requirement metadata", () => {
  const events = mapScheduleProjectionSourceToAdminEvents(
    makeSource({
      deliveryMode: "SHARED_CLASSES",
      deliveryGroup: null,
      coveredClasses: [CLASS_3B, CLASS_3A],
      subjectId: "subject-lunch",
      subjectName: "Обед",
      subjectType: "REGIME",
      attendanceLoadMode: "FULL_CLASS_SIZE",
    }),
    {
      "class-3a:subject-lunch": {
        lessonsPerWeek: 5,
        breakDuration: 0,
      },
      "class-3b:subject-lunch": {
        lessonsPerWeek: 5,
        breakDuration: 15,
      },
    },
  );

  assert.deepEqual(events.map((event) => event.classId), ["class-3a", "class-3b"]);
  assert.deepEqual(events[0].coveredClassIds, ["class-3a", "class-3b"]);
  assert.equal(events[0].groupName, "3А + 3Б");
  assert.equal(events[0].groupType, "CLASS");
  assert.equal(events[0].minimumBreakAfterMinutes, 0);
  assert.equal(events[1].minimumBreakAfterMinutes, 15);
});

function makeSource(overrides: Partial<ScheduleProjectionSource>): ScheduleProjectionSource {
  return {
    id: "source-1",
    deliveryMode: "DIRECT_GROUP",
    deliveryGroup: {
      ...CLASS_3A,
      subjectId: null,
      parentGroup: null,
    },
    openClasses: [],
    coveredClasses: [],
    start: new Date(2026, 0, 5, 8, 0),
    end: new Date(2026, 0, 5, 8, 45),
    dayOfWeek: 1,
    startMinutes: 8 * 60,
    endMinutes: 8 * 60 + 45,
    detached: false,
    subjectId: "subject-math",
    subjectName: "Математика",
    subjectType: "ACADEMIC",
    attendanceLoadMode: "DELIVERY_GROUP_SIZE",
    teacherId: "teacher-1",
    teacherName: "Иванов Иван Иванович",
    roomId: "room-101",
    roomName: "101",
    roomSeatsCount: 30,
    ...overrides,
  };
}

function makeClass(
  id: string,
  name: string,
  studentCount: number,
  grade: number | null,
): ScheduleProjectionLinkedClass {
  return {
    id,
    name,
    grade,
    studentCount,
    type: "CLASS",
  };
}
