import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaClient } from "@/generated/prisma/client";
import { buildCoreActivities } from "@/features/fet/build-core-activities";
import { buildFullActivities } from "@/features/fet/build-full-activities";
import { buildRegimeActivities } from "@/features/fet/build-regime-activities";
import { generateWeeklyScheduleTemplate } from "@/features/fet/generate-weekly-template";
import { buildFetXml } from "@/features/fet/fet-xml";
import { assertActivityInsideSlots, importFetActivitiesXml, mapImportedActivitiesToTemplateRows } from "@/features/fet/importer";
import { preflightFetInput } from "@/features/fet/preflight";
import { getRegimeConstraintRule } from "@/features/fet/regime-constraints";
import { assignTeachers } from "@/features/fet/teacher-assignment";
import type { FetInput, FetRunRequest } from "@/features/fet/types";

function createInput(overrides: Partial<FetInput> = {}): FetInput {
  const input: FetInput = {
    groups: [
      { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
      { id: "group-2", name: "1Б", type: "CLASS", grade: 1, parentId: null },
    ],
    subjects: [
      { id: "breakfast", name: "Завтрак", type: "REGIME" },
      { id: "lunch", name: "Обед", type: "REGIME" },
      { id: "snack", name: "Полдник", type: "REGIME" },
      { id: "math", name: "Математика", type: "ACADEMIC" },
    ],
    requirements: [
      {
        groupId: "group-1",
        subjectId: "breakfast",
        lessonsPerWeek: 5,
        durationInMinutes: 30,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "breakfast", name: "Завтрак", type: "REGIME" },
      },
      {
        groupId: "group-1",
        subjectId: "math",
        lessonsPerWeek: 2,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "math", name: "Математика", type: "ACADEMIC" },
      },
      {
        groupId: "group-2",
        subjectId: "math",
        lessonsPerWeek: 1,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "group-2", name: "1Б", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "math", name: "Математика", type: "ACADEMIC" },
      },
    ],
    regimeRequirements: [],
    lessonRequirements: [],
    teacherSubjects: [
      { teacherId: "teacher-1", subjectId: "math", minGrade: 1, maxGrade: 4 },
      { teacherId: "teacher-2", subjectId: "math", minGrade: 1, maxGrade: 4 },
    ],
    teacherAvailabilities: [],
    rooms: [
      { id: "canteen", name: "Столовая" },
      { id: "room-101", name: "101" },
    ],
    roomSubjects: [
      { roomId: "canteen", subjectId: "breakfast" },
      { roomId: "room-101", subjectId: "math" },
    ],
    electiveGroupClassLinks: [],
    ...overrides,
  };

  return {
    ...input,
    regimeRequirements: input.requirements.filter((requirement) => requirement.subject.type === "REGIME"),
    lessonRequirements: input.requirements.filter((requirement) => requirement.subject.type !== "REGIME"),
  };
}

function activityXml(ids: number[]): string {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  return `<Activities_Timetable>
${ids.map((id, index) => `<Activity><Id>${id}</Id><Day>${days[index % days.length]}</Day><Hour>08:30</Hour><Room>canteen</Room></Activity>`).join("\n")}
 </Activities_Timetable>`;
}

test("regime config lookup finds breakfast rule", () => {
  const rule = getRegimeConstraintRule("Завтрак");

  assert.equal(rule?.maxPerDay, 1);
  assert.equal(rule?.allowedWindowsByDay.length, 5);
});

test("REGIME lessonsPerWeek=5 creates five activities on five separate days", () => {
  const activities = buildRegimeActivities(createInput());

  assert.equal(activities.length, 5);
  assert.deepEqual(
    activities.map((activity) => activity.allowedSlots[0].dayOfWeek),
    [1, 2, 3, 4, 5],
  );
});

test("preflight fails when a REGIME subject lacks config", () => {
  const input = createInput({
    requirements: [
      {
        groupId: "group-1",
        subjectId: "unknown",
        lessonsPerWeek: 1,
        durationInMinutes: 30,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "unknown", name: "Неизвестный режим", type: "REGIME" },
      },
    ],
    subjects: [{ id: "unknown", name: "Неизвестный режим", type: "REGIME" }],
  });

  assert.throws(() => preflightFetInput(input), /не задано временное окно/);
});

test("preflight fails when REGIME lessons exceed configured days", () => {
  const input = createInput();
  input.regimeRequirements[0].lessonsPerWeek = 6;

  assert.throws(() => preflightFetInput(input), /доступно только 5 дней/);
});

test("preflight fails when sibling subject subgroups do not have enough distinct teachers", () => {
  const input = createInput({
    groups: [
      { id: "class-1", name: "3 А", type: "CLASS", grade: 3, parentId: null },
      { id: "subgroup-1", name: "3 А - подгруппа 1", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1", subjectId: "math" },
      { id: "subgroup-2", name: "3 А - подгруппа 2", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1", subjectId: "math" },
    ],
    requirements: [
      {
        groupId: "subgroup-1",
        subjectId: "math",
        lessonsPerWeek: 1,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "subgroup-1", name: "3 А - подгруппа 1", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1", subjectId: "math" },
        subject: { id: "math", name: "Математика", type: "ACADEMIC" },
      },
      {
        groupId: "subgroup-2",
        subjectId: "math",
        lessonsPerWeek: 1,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "subgroup-2", name: "3 А - подгруппа 2", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1", subjectId: "math" },
        subject: { id: "math", name: "Математика", type: "ACADEMIC" },
      },
    ],
    teacherSubjects: [{ teacherId: "teacher-1", subjectId: "math", minGrade: 1, maxGrade: 4 }],
  });

  assert.throws(() => preflightFetInput(input), /минимум 2 разных преподавателей/);
});

test("breakfast activity slots stay inside configured breakfast window", () => {
  const activities = buildRegimeActivities(createInput());

  for (const activity of activities) {
    assert.ok(activity.allowedSlots.length > 0);
    assert.ok(activity.allowedSlots.every((slot) => slot.startTime >= 8 * 60 + 30));
    assert.ok(activity.allowedSlots.every((slot) => slot.startTime + activity.durationInMinutes <= 10 * 60 + 30));
  }
});

test("teacher assignment keeps one teacher for group + subject lessons and reuses grade + subject", () => {
  const activities = buildCoreActivities(createInput());
  const ordinary = activities.filter((activity) => activity.subjectId === "math");

  assert.equal(new Set(ordinary.filter((activity) => activity.groupId === "group-1").map((activity) => activity.teacherId)).size, 1);
  assert.equal(new Set(ordinary.map((activity) => activity.teacherId)).size, 1);
});

test("subject subgroups use different teachers and suppress whole-class subject lessons", () => {
  const input = createInput({
    groups: [
      { id: "class-1", name: "3 А", type: "CLASS", grade: 3, parentId: null },
      { id: "subgroup-1", name: "3 А - подгруппа 1", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1", subjectId: "math" },
      { id: "subgroup-2", name: "3 А - подгруппа 2", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1", subjectId: "math" },
    ],
    requirements: [
      {
        groupId: "class-1",
        subjectId: "math",
        lessonsPerWeek: 2,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "class-1", name: "3 А", type: "CLASS", grade: 3, parentId: null },
        subject: { id: "math", name: "Математика", type: "ACADEMIC" },
      },
      {
        groupId: "subgroup-1",
        subjectId: "math",
        lessonsPerWeek: 2,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "subgroup-1", name: "3 А - подгруппа 1", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1", subjectId: "math" },
        subject: { id: "math", name: "Математика", type: "ACADEMIC" },
      },
      {
        groupId: "subgroup-2",
        subjectId: "math",
        lessonsPerWeek: 2,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "subgroup-2", name: "3 А - подгруппа 2", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1", subjectId: "math" },
        subject: { id: "math", name: "Математика", type: "ACADEMIC" },
      },
    ],
  });

  const assignments = assignTeachers(input);
  const activities = buildCoreActivities(input);

  assert.notEqual(assignments.get("subgroup-1:math"), assignments.get("subgroup-2:math"));
  assert.equal(assignments.has("class-1:math"), false);
  assert.equal(activities.some((activity) => activity.groupId === "class-1" && activity.subjectId === "math"), false);
  assert.equal(activities.filter((activity) => activity.groupId === "subgroup-1" && activity.subjectId === "math").length, 2);
  assert.equal(activities.filter((activity) => activity.groupId === "subgroup-2" && activity.subjectId === "math").length, 2);
});

test("ordinary builder schedules academics before electives window", () => {
  const activities = buildCoreActivities(createInput());
  const academicActivity = activities.find((activity) => activity.subjectId === "math");
  assert.ok(academicActivity);
  assert.ok(academicActivity.allowedSlots.every((slot) => slot.startTime + academicActivity.durationInMinutes <= 14 * 60));

  const input = createInput({
    subjects: [
      { id: "elective", name: "Кулинария", type: "ELECTIVE_OPTIONAL" },
    ],
    requirements: [
      {
        groupId: "group-1",
        subjectId: "elective",
        lessonsPerWeek: 1,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "elective", name: "Кулинария", type: "ELECTIVE_OPTIONAL" },
      },
    ],
    teacherSubjects: [{ teacherId: "teacher-1", subjectId: "elective", minGrade: 1, maxGrade: 4 }],
    roomSubjects: [{ roomId: "room-101", subjectId: "elective" }],
  });
  const { activities: electiveActivities } = buildFullActivities(input, []);
  assert.ok(electiveActivities[0].allowedSlots.every((slot) => slot.startTime >= 14 * 60));
});

test("core builder includes academics and breakfast/lunch but excludes other regime and electives", () => {
  const input = createInput({
    subjects: [
      { id: "breakfast", name: "Завтрак", type: "REGIME" },
      { id: "lunch", name: "Обед", type: "REGIME" },
      { id: "snack", name: "Полдник", type: "REGIME" },
      { id: "math", name: "Математика", type: "ACADEMIC" },
      { id: "elective", name: "Кулинария", type: "ELECTIVE_REQUIRED" },
    ],
    requirements: [
      {
        groupId: "group-1",
        subjectId: "breakfast",
        lessonsPerWeek: 5,
        durationInMinutes: 30,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "breakfast", name: "Завтрак", type: "REGIME" },
      },
      {
        groupId: "group-1",
        subjectId: "lunch",
        lessonsPerWeek: 5,
        durationInMinutes: 30,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "lunch", name: "Обед", type: "REGIME" },
      },
      {
        groupId: "group-1",
        subjectId: "snack",
        lessonsPerWeek: 5,
        durationInMinutes: 20,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "snack", name: "Полдник", type: "REGIME" },
      },
      {
        groupId: "group-1",
        subjectId: "math",
        lessonsPerWeek: 2,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "math", name: "Математика", type: "ACADEMIC" },
      },
      {
        groupId: "group-1",
        subjectId: "elective",
        lessonsPerWeek: 1,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "elective", name: "Кулинария", type: "ELECTIVE_REQUIRED" },
      },
    ],
    teacherSubjects: [
      { teacherId: "teacher-1", subjectId: "math", minGrade: 1, maxGrade: 4 },
      { teacherId: "teacher-1", subjectId: "elective", minGrade: 1, maxGrade: 4 },
    ],
    roomSubjects: [
      { roomId: "canteen", subjectId: "breakfast" },
      { roomId: "canteen", subjectId: "lunch" },
      { roomId: "canteen", subjectId: "snack" },
      { roomId: "room-101", subjectId: "math" },
      { roomId: "room-101", subjectId: "elective" },
    ],
  });

  const activities = buildCoreActivities(input);

  assert.equal(activities.filter((activity) => activity.subjectId === "math").length, 2);
  assert.equal(activities.filter((activity) => activity.subjectId === "breakfast").length, 5);
  assert.equal(activities.filter((activity) => activity.subjectId === "lunch").length, 5);
  assert.equal(activities.some((activity) => activity.subjectId === "snack"), false);
  assert.equal(activities.some((activity) => activity.subjectId === "elective"), false);
});

test("full builder places add-ons after locked academic core for that day", () => {
  const input = createInput({
    subjects: [
      { id: "math", name: "Математика", type: "ACADEMIC" },
      { id: "elective", name: "Кулинария", type: "ELECTIVE_REQUIRED" },
    ],
    requirements: [
      {
        groupId: "group-1",
        subjectId: "math",
        lessonsPerWeek: 1,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "math", name: "Математика", type: "ACADEMIC" },
      },
      {
        groupId: "group-1",
        subjectId: "elective",
        lessonsPerWeek: 1,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "elective", name: "Кулинария", type: "ELECTIVE_REQUIRED" },
      },
    ],
    teacherSubjects: [
      { teacherId: "teacher-1", subjectId: "math", minGrade: 1, maxGrade: 4 },
      { teacherId: "teacher-1", subjectId: "elective", minGrade: 1, maxGrade: 4 },
    ],
    roomSubjects: [
      { roomId: "room-101", subjectId: "math" },
      { roomId: "room-101", subjectId: "elective" },
    ],
  });

  const { activities } = buildFullActivities(input, [{
    id: 1,
    source: "LOCKED_CORE",
    groupId: "group-1",
    subjectId: "math",
    teacherId: "teacher-1",
    durationInMinutes: 45,
    allowedSlots: [{ dayOfWeek: 1, startTime: 12 * 60 }],
    roomIds: ["room-101"],
    fixedSlot: { dayOfWeek: 1, startTime: 12 * 60 },
    fixedRoomId: "room-101",
  }]);
  const elective = activities.find((activity) => activity.subjectId === "elective");

  assert.ok(elective);
  assert.ok(elective.allowedSlots
    .filter((slot) => slot.dayOfWeek === 1)
    .every((slot) => slot.startTime >= 12 * 60 + 45));
  assert.equal(activities.some((activity) => activity.subjectId === "math" && activity.source === "ORDINARY"), false);
});

test("full builder skips snack regime requirements", () => {
  const input = createInput({
    subjects: [
      { id: "math", name: "Математика", type: "ACADEMIC" },
      { id: "snack", name: "Полдник", type: "REGIME" },
    ],
    requirements: [
      {
        groupId: "group-1",
        subjectId: "snack",
        lessonsPerWeek: 5,
        durationInMinutes: 15,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "snack", name: "Полдник", type: "REGIME" },
      },
    ],
    roomSubjects: [{ roomId: "canteen", subjectId: "snack" }],
  });

  const { activities } = buildFullActivities(input, [{
    id: 1,
    source: "LOCKED_CORE",
    groupId: "group-1",
    subjectId: "math",
    teacherId: "teacher-1",
    durationInMinutes: 45,
    allowedSlots: [{ dayOfWeek: 1, startTime: 16 * 60 }],
    roomIds: ["room-101"],
    fixedSlot: { dayOfWeek: 1, startTime: 16 * 60 },
    fixedRoomId: "room-101",
  }]);

  assert.equal(activities.some((activity) => activity.subjectId === "snack"), false);
});

test("full builder fails before FET when an activity has no allowed slots", () => {
  const input = createInput({
    subjects: [
      { id: "math", name: "Математика", type: "ACADEMIC" },
      { id: "elective", name: "Кулинария", type: "ELECTIVE_REQUIRED" },
    ],
    requirements: [
      {
        groupId: "group-1",
        subjectId: "elective",
        lessonsPerWeek: 1,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
        subject: { id: "elective", name: "Кулинария", type: "ELECTIVE_REQUIRED" },
      },
    ],
    teacherSubjects: [{ teacherId: "teacher-1", subjectId: "elective", minGrade: 1, maxGrade: 4 }],
    roomSubjects: [{ roomId: "room-101", subjectId: "elective" }],
  });

  assert.throws(() => buildFullActivities(input, ([1, 2, 3, 4, 5] as const).map((dayOfWeek) => ({
    id: dayOfWeek,
    source: "LOCKED_CORE",
    groupId: "group-1",
    subjectId: "math",
    teacherId: "teacher-1",
    durationInMinutes: 45,
    allowedSlots: [{ dayOfWeek, startTime: 17 * 60 + 15 }],
    roomIds: ["room-101"],
    fixedSlot: { dayOfWeek, startTime: 17 * 60 + 15 },
    fixedRoomId: "room-101",
  }))), /не осталось разрешенных слотов/);
});

test("optional add-ons inherit opened class core bounds and meal blockers", () => {
  const input = createInput({
    groups: [
      { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
      { id: "optional-group", name: "Кулинария", type: "ELECTIVE_GROUP", grade: null, parentId: null },
    ],
    subjects: [
      { id: "breakfast", name: "Завтрак", type: "REGIME" },
      { id: "math", name: "Математика", type: "ACADEMIC" },
      { id: "elective", name: "Кулинария", type: "ELECTIVE_OPTIONAL" },
    ],
    requirements: [
      {
        groupId: "optional-group",
        subjectId: "elective",
        lessonsPerWeek: 1,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "optional-group", name: "Кулинария", type: "ELECTIVE_GROUP", grade: null, parentId: null },
        subject: { id: "elective", name: "Кулинария", type: "ELECTIVE_OPTIONAL" },
      },
    ],
    teacherSubjects: [{ teacherId: "teacher-1", subjectId: "elective", minGrade: 1, maxGrade: 4 }],
    roomSubjects: [
      { roomId: "canteen", subjectId: "breakfast" },
      { roomId: "room-101", subjectId: "elective" },
    ],
    electiveGroupClassLinks: [{ electiveGroupId: "optional-group", classGroupId: "group-1" }],
  });

  const { activities } = buildFullActivities(input, [
    {
      id: 1,
      source: "LOCKED_CORE",
      groupId: "group-1",
      subjectId: "math",
      teacherId: "teacher-1",
      durationInMinutes: 45,
      allowedSlots: [{ dayOfWeek: 1, startTime: 14 * 60 + 15 }],
      roomIds: ["room-101"],
      fixedSlot: { dayOfWeek: 1, startTime: 14 * 60 + 15 },
      fixedRoomId: "room-101",
    },
    {
      id: 2,
      source: "LOCKED_CORE",
      groupId: "group-1",
      subjectId: "breakfast",
      teacherId: null,
      durationInMinutes: 30,
      allowedSlots: [{ dayOfWeek: 1, startTime: 13 * 60 }],
      roomIds: ["canteen"],
      fixedSlot: { dayOfWeek: 1, startTime: 13 * 60 },
      fixedRoomId: "canteen",
    },
  ]);
  const elective = activities.find((activity) => activity.subjectId === "elective");

  assert.ok(elective);
  assert.ok(elective.allowedSlots
    .filter((slot) => slot.dayOfWeek === 1)
    .every((slot) => slot.startTime >= 15 * 60));
  assert.deepEqual(elective.notOverlappingActivityIds, [2]);

  const xml = buildFetXml(input, activities);
  assert.match(xml, /<ConstraintActivitiesNotOverlapping>/);
  assert.match(xml, /<Activity_Id>3<\/Activity_Id>[\s\S]*<Activity_Id>2<\/Activity_Id>/);
});

test("importer maps FET activities to WeeklyScheduleTemplate rows", () => {
  const activities = buildRegimeActivities(createInput()).slice(0, 1);
  const imported = importFetActivitiesXml(activityXml([1]));
  const rows = mapImportedActivitiesToTemplateRows(activities, imported);

  assert.deepEqual(rows[0], {
    dayOfWeek: 1,
    startTime: 510,
    endTime: 540,
    groupId: "group-1",
    roomId: "canteen",
    teacherId: null,
    subjectId: "breakfast",
  });
});

test("soft activity time preferences may be violated by FET", () => {
  assert.doesNotThrow(() => assertActivityInsideSlots({
    id: 1,
    source: "CORE",
    groupId: "group-1",
    subjectId: "math",
    teacherId: "teacher-1",
    durationInMinutes: 45,
    allowedSlots: [{ dayOfWeek: 1, startTime: 8 * 60 + 30 }],
    timeConstraintWeight: 95,
    roomIds: ["room-101"],
  }, {
    activityId: 1,
    dayOfWeek: 1,
    startTime: 17 * 60,
    roomId: "room-101",
  }));
});

test("hard activity time preferences must stay inside allowed slots", () => {
  assert.throws(() => assertActivityInsideSlots({
    id: 1,
    source: "CORE",
    groupId: "group-1",
    subjectId: "breakfast",
    teacherId: null,
    durationInMinutes: 30,
    allowedSlots: [{ dayOfWeek: 1, startTime: 8 * 60 + 30 }],
    roomIds: ["canteen"],
  }, {
    activityId: 1,
    dayOfWeek: 1,
    startTime: 17 * 60,
    roomId: "canteen",
  }), /вне разрешенного окна/);
});

test("FET XML omits empty teacher tags for teacherless regime activities", () => {
  const xml = buildFetXml(createInput(), buildRegimeActivities(createInput()).slice(0, 1));

  assert.equal(xml.includes("<Teacher></Teacher>"), false);
  assert.equal(xml.includes("<Teacher/>"), false);
});

test("FET XML nests subject subgroups under their parent class", () => {
  const input = createInput({
    groups: [
      { id: "class-1", name: "3 А", type: "CLASS", grade: 3, parentId: null },
      { id: "subgroup-1", name: "3 А - подгруппа 1", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1" },
    ],
    requirements: [
      {
        groupId: "class-1",
        subjectId: "math",
        lessonsPerWeek: 1,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "class-1", name: "3 А", type: "CLASS", grade: 3, parentId: null },
        subject: { id: "math", name: "Математика", type: "ACADEMIC" },
      },
      {
        groupId: "subgroup-1",
        subjectId: "math",
        lessonsPerWeek: 1,
        durationInMinutes: 45,
        breakDuration: 0,
        group: { id: "subgroup-1", name: "3 А - подгруппа 1", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1" },
        subject: { id: "math", name: "Математика", type: "ACADEMIC" },
      },
    ],
  });
  const activities = buildCoreActivities(input);
  const xml = buildFetXml(input, activities);

  assert.match(xml, /<Year>[\s\S]*<Name>class-1<\/Name>[\s\S]*<Group>[\s\S]*<Name>subgroup-1<\/Name>[\s\S]*<\/Group>[\s\S]*<\/Year>/);
});

test("FET XML adds minimum gaps between activities for the same student group", () => {
  const input = createInput();
  const xml = buildFetXml(input, [
    {
      id: 1,
      source: "CORE",
      groupId: "group-1",
      subjectId: "math",
      teacherId: "teacher-1",
      durationInMinutes: 45,
      breakAfterMinutes: 15,
      allowedSlots: [{ dayOfWeek: 1, startTime: 8 * 60 + 30 }],
      roomIds: ["room-101"],
    },
    {
      id: 2,
      source: "CORE",
      groupId: "group-1",
      subjectId: "math",
      teacherId: "teacher-1",
      durationInMinutes: 45,
      breakAfterMinutes: 0,
      allowedSlots: [{ dayOfWeek: 1, startTime: 9 * 60 + 30 }],
      roomIds: ["room-101"],
    },
  ]);

  assert.match(xml, /<ConstraintMinGapsBetweenActivities>/);
  assert.match(xml, /<Activity_Id>1<\/Activity_Id>[\s\S]*<Activity_Id>2<\/Activity_Id>[\s\S]*<MinGaps>3<\/MinGaps>/);
});

test("FET breakDuration constraints can be disabled for exported activities", () => {
  const previous = process.env.FET_ENABLE_BREAK_DURATION_CONSTRAINTS;
  process.env.FET_ENABLE_BREAK_DURATION_CONSTRAINTS = "false";

  try {
    const input = createInput({
      requirements: createInput().requirements.map((requirement) =>
        requirement.subjectId === "math"
          ? { ...requirement, breakDuration: 15 }
          : requirement,
      ),
    });
    const activities = buildCoreActivities(input);
    const mathActivities = activities.filter((activity) => activity.subjectId === "math");
    const xml = buildFetXml(input, mathActivities);

    assert.ok(mathActivities.length > 1);
    assert.ok(mathActivities.every((activity) => activity.breakAfterMinutes === 0));
    assert.equal(xml.includes("<ConstraintMinGapsBetweenActivities>"), false);
  } finally {
    if (previous === undefined) {
      delete process.env.FET_ENABLE_BREAK_DURATION_CONSTRAINTS;
    } else {
      process.env.FET_ENABLE_BREAK_DURATION_CONSTRAINTS = previous;
    }
  }
});

test("FET XML does not add minimum gaps between sibling subgroups", () => {
  const input = createInput({
    groups: [
      { id: "class-1", name: "3 А", type: "CLASS", grade: 3, parentId: null },
      { id: "subgroup-1", name: "3 А - подгруппа 1", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1" },
      { id: "subgroup-2", name: "3 А - подгруппа 2", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1" },
    ],
  });
  const xml = buildFetXml(input, [
    {
      id: 1,
      source: "CORE",
      groupId: "subgroup-1",
      subjectId: "math",
      teacherId: "teacher-1",
      durationInMinutes: 45,
      breakAfterMinutes: 15,
      allowedSlots: [{ dayOfWeek: 1, startTime: 8 * 60 + 30 }],
      roomIds: ["room-101"],
    },
    {
      id: 2,
      source: "CORE",
      groupId: "subgroup-2",
      subjectId: "math",
      teacherId: "teacher-1",
      durationInMinutes: 45,
      breakAfterMinutes: 0,
      allowedSlots: [{ dayOfWeek: 1, startTime: 8 * 60 + 30 }],
      roomIds: ["room-101"],
    },
  ]);

  assert.equal(xml.includes("<ConstraintMinGapsBetweenActivities>"), false);
});

test("FET XML prefers sibling subject subgroups at the same starting time", () => {
  const input = createInput({
    groups: [
      { id: "class-1", name: "3 А", type: "CLASS", grade: 3, parentId: null },
      { id: "subgroup-1", name: "3 А - подгруппа 1", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1", subjectId: "math" },
      { id: "subgroup-2", name: "3 А - подгруппа 2", type: "SUBJECT_SUBGROUP", grade: 3, parentId: "class-1", subjectId: "math" },
    ],
  });
  const xml = buildFetXml(input, [
    {
      id: 1,
      source: "CORE",
      groupId: "subgroup-1",
      subjectId: "math",
      teacherId: "teacher-1",
      durationInMinutes: 45,
      breakAfterMinutes: 0,
      allowedSlots: [{ dayOfWeek: 1, startTime: 8 * 60 + 30 }],
      roomIds: ["room-101"],
    },
    {
      id: 2,
      source: "CORE",
      groupId: "subgroup-2",
      subjectId: "math",
      teacherId: "teacher-2",
      durationInMinutes: 45,
      breakAfterMinutes: 0,
      allowedSlots: [{ dayOfWeek: 1, startTime: 8 * 60 + 30 }],
      roomIds: ["room-101"],
    },
  ]);

  assert.match(xml, /<ConstraintActivitiesSameStartingTime>/);
  assert.match(xml, /<Weight_Percentage>95<\/Weight_Percentage>/);
  assert.match(xml, /<Activity_Id>1<\/Activity_Id>[\s\S]*<Activity_Id>2<\/Activity_Id>/);
});

test("FET XML does not require a break before meal regime activities", () => {
  const input = createInput();
  const xml = buildFetXml(input, [
    {
      id: 1,
      source: "CORE",
      groupId: "group-1",
      subjectId: "math",
      teacherId: "teacher-1",
      durationInMinutes: 45,
      breakAfterMinutes: 15,
      allowedSlots: [{ dayOfWeek: 1, startTime: 8 * 60 + 30 }],
      roomIds: ["room-101"],
    },
    {
      id: 2,
      source: "CORE",
      groupId: "group-1",
      subjectId: "breakfast",
      teacherId: null,
      durationInMinutes: 30,
      breakAfterMinutes: 0,
      allowedSlots: [{ dayOfWeek: 1, startTime: 9 * 60 + 15 }],
      roomIds: ["canteen"],
    },
  ]);

  assert.equal(xml.includes("<ConstraintMinGapsBetweenActivities>"), false);
});

test("FET XML can require breaks around meal regime activities when env disables rest exemption", () => {
  const previous = process.env.FET_ALLOW_ZERO_BREAK_AROUND_REST;
  process.env.FET_ALLOW_ZERO_BREAK_AROUND_REST = "false";

  try {
    const input = createInput();
    const xml = buildFetXml(input, [
      {
        id: 1,
        source: "CORE",
        groupId: "group-1",
        subjectId: "math",
        teacherId: "teacher-1",
        durationInMinutes: 45,
        breakAfterMinutes: 15,
        allowedSlots: [{ dayOfWeek: 1, startTime: 8 * 60 + 30 }],
        roomIds: ["room-101"],
      },
      {
        id: 2,
        source: "CORE",
        groupId: "group-1",
        subjectId: "breakfast",
        teacherId: null,
        durationInMinutes: 30,
        breakAfterMinutes: 0,
        allowedSlots: [{ dayOfWeek: 1, startTime: 9 * 60 + 15 }],
        roomIds: ["canteen"],
      },
    ]);

    assert.match(xml, /<ConstraintMinGapsBetweenActivities>/);
    assert.match(xml, /<Activity_Id>1<\/Activity_Id>[\s\S]*<Activity_Id>2<\/Activity_Id>[\s\S]*<MinGaps>3<\/MinGaps>/);
  } finally {
    if (previous === undefined) {
      delete process.env.FET_ALLOW_ZERO_BREAK_AROUND_REST;
    } else {
      process.env.FET_ALLOW_ZERO_BREAK_AROUND_REST = previous;
    }
  }
});

test("FET XML keeps breakfast and lunch at the same hour across weekdays for a class", () => {
  const activities = buildCoreActivities(createInput());
  const breakfastActivityIds = activities
    .filter((activity) => activity.subjectId === "breakfast")
    .map((activity) => activity.id);
  const xml = buildFetXml(createInput(), activities);

  assert.equal(breakfastActivityIds.length, 5);
  assert.match(xml, /<ConstraintActivitiesSameStartingHour>/);
  assert.match(xml, new RegExp(
    `<Number_of_Activities>5<\\/Number_of_Activities>[\\s\\S]*${breakfastActivityIds
      .map((activityId) => `<Activity_Id>${activityId}<\\/Activity_Id>`)
      .join("[\\s\\S]*")}`,
  ));
});

test("FET XML can include compact student day preference for full pass", () => {
  const xml = buildFetXml(createInput(), buildRegimeActivities(createInput()).slice(0, 1), {
    includeStudentGapConstraints: true,
  });

  assert.match(xml, /<ConstraintStudentsMaxGapsPerWeek>/);
  assert.match(xml, /<Max_Gaps>0<\/Max_Gaps>/);
});

test("generation with mocked FET runner replaces templates after full pass", async () => {
  const calls: FetRunRequest[] = [];
  let deleted = false;
  let insertedCount = 0;
  const db = {
    $transaction: async (callback: (tx: unknown) => Promise<{ count: number }>) => callback({
      weeklyScheduleTemplate: {
        deleteMany: async () => {
          deleted = true;
          return { count: 3 };
        },
        createMany: async ({ data }: { data: unknown[] }) => {
          insertedCount = data.length;
        },
      },
    }),
  } as unknown as PrismaClient;

  const result = await generateWeeklyScheduleTemplate({
    input: createInput({ requirements: createInput().requirements.slice(0, 1) }),
    prismaClient: db,
    artifactId: "test-artifact",
    runner: async (request) => {
      calls.push(request);
      return { artifactDir: "", outputActivitiesXmlPath: `${request.kind}.xml`, warnings: [] };
    },
    readActivitiesXml: async (filePath) => filePath === "core.xml" ? activityXml([1, 2, 3, 4, 5]) : activityXml([1, 2, 3, 4, 5]),
  });

  assert.equal(calls.length, 2);
  assert.equal(deleted, true);
  assert.equal(insertedCount, 5);
  assert.equal(result.deletedTemplateCount, 3);
  assert.equal(result.insertedTemplateCount, 5);
});

test("failed core pass does not run full pass and does not touch DB", async () => {
  const calls: FetRunRequest[] = [];
  let touchedDb = false;
  const db = {
    $transaction: async () => {
      touchedDb = true;
    },
  } as unknown as PrismaClient;

  await assert.rejects(
    generateWeeklyScheduleTemplate({
      input: createInput({ requirements: createInput().requirements.slice(0, 1) }),
      prismaClient: db,
      artifactId: "test-artifact",
      runner: async (request) => {
        calls.push(request);
        throw new Error("regime failed");
      },
    }),
    /regime failed/,
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].kind, "core");
  assert.equal(touchedDb, false);
});
