import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaClient } from "@/generated/prisma/client";
import { buildFullActivities } from "@/features/fet/build-full-activities";
import { buildRegimeActivities } from "@/features/fet/build-regime-activities";
import { generateWeeklyScheduleTemplate } from "@/features/fet/generate-weekly-template";
import { buildFetXml } from "@/features/fet/fet-xml";
import { importFetActivitiesXml, mapImportedActivitiesToTemplateRows } from "@/features/fet/importer";
import { preflightFetInput } from "@/features/fet/preflight";
import { getRegimeConstraintRule } from "@/features/fet/regime-constraints";
import type { FetInput, FetRunRequest } from "@/features/fet/types";

function createInput(overrides: Partial<FetInput> = {}): FetInput {
  const input: FetInput = {
    groups: [
      { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null },
      { id: "group-2", name: "1Б", type: "CLASS", grade: 1, parentId: null },
    ],
    subjects: [
      { id: "breakfast", name: "Завтрак", type: "REGIME" },
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

test("preflight fails when assigned teachers have no available slots", () => {
  assert.throws(() => preflightFetInput(createInput()), /Недостаточно доступности преподавателей/);
});

test("preflight passes when assigned teachers have enough available slots", () => {
  assert.doesNotThrow(() => preflightFetInput(createInput({
    teacherAvailabilities: [
      { teacherId: "teacher-1", dayOfWeek: 1, startTime: 8 * 60, endTime: 18 * 60, type: "AVAILABLE" },
      { teacherId: "teacher-1", dayOfWeek: 2, startTime: 8 * 60, endTime: 18 * 60, type: "AVAILABLE" },
      { teacherId: "teacher-1", dayOfWeek: 3, startTime: 8 * 60, endTime: 18 * 60, type: "AVAILABLE" },
      { teacherId: "teacher-1", dayOfWeek: 4, startTime: 8 * 60, endTime: 18 * 60, type: "AVAILABLE" },
      { teacherId: "teacher-1", dayOfWeek: 5, startTime: 8 * 60, endTime: 18 * 60, type: "AVAILABLE" },
    ],
  })));
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
  const { activities } = buildFullActivities(createInput(), []);
  const ordinary = activities.filter((activity) => activity.subjectId === "math");

  assert.equal(new Set(ordinary.filter((activity) => activity.groupId === "group-1").map((activity) => activity.teacherId)).size, 1);
  assert.equal(new Set(ordinary.map((activity) => activity.teacherId)).size, 1);
});

test("ordinary builder schedules academics before electives window", () => {
  const { activities } = buildFullActivities(createInput(), []);
  const academicActivity = activities.find((activity) => activity.subjectId === "math");
  assert.ok(academicActivity);
  assert.ok(academicActivity.allowedSlots.every((slot) => slot.startTime + academicActivity.durationInMinutes <= 14 * 60));
  assert.equal(academicActivity.timeConstraintWeight, 100);

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
  assert.equal(electiveActivities[0].timeConstraintWeight, 100);
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
    deliveryMode: "DIRECT_GROUP",
    deliveryGroupId: "group-1",
    openClassIds: [],
    coveredClassIds: [],
    attendanceLoadModeOverride: null,
  });
});

test("REGIME builder groups nearby classes when a room has enough capacity", () => {
  const input = createInput({
    groups: [
      { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null, studentCount: 12 },
      { id: "group-2", name: "2А", type: "CLASS", grade: 2, parentId: null, studentCount: 13 },
    ],
    subjects: [
      { id: "breakfast", name: "Завтрак", type: "REGIME", defaultAttendanceLoadMode: "FULL_CLASS_SIZE" },
    ],
    requirements: [
      {
        groupId: "group-1",
        subjectId: "breakfast",
        lessonsPerWeek: 1,
        durationInMinutes: 30,
        breakDuration: 0,
        group: { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null, studentCount: 12 },
        subject: { id: "breakfast", name: "Завтрак", type: "REGIME", defaultAttendanceLoadMode: "FULL_CLASS_SIZE" },
      },
      {
        groupId: "group-2",
        subjectId: "breakfast",
        lessonsPerWeek: 1,
        durationInMinutes: 30,
        breakDuration: 0,
        group: { id: "group-2", name: "2А", type: "CLASS", grade: 2, parentId: null, studentCount: 13 },
        subject: { id: "breakfast", name: "Завтрак", type: "REGIME", defaultAttendanceLoadMode: "FULL_CLASS_SIZE" },
      },
    ],
    rooms: [{ id: "canteen", name: "Столовая", seatsCount: 30 }],
  });

  const activities = buildRegimeActivities(input);

  assert.equal(activities.length, 1);
  assert.equal(activities[0].deliveryMode, "SHARED_CLASSES");
  assert.deepEqual(activities[0].studentSetIds, ["group-1", "group-2"]);
  assert.deepEqual(activities[0].coveredClassIds, ["group-1", "group-2"]);
  assert.equal(activities[0].expectedAudienceSize, 25);
});

test("FET XML writes student and room capacities and multiple activity student sets", () => {
  const input = createInput({
    groups: [
      { id: "group-1", name: "1А", type: "CLASS", grade: 1, parentId: null, studentCount: 12 },
      { id: "group-2", name: "2А", type: "CLASS", grade: 2, parentId: null, studentCount: 13 },
    ],
    rooms: [{ id: "canteen", name: "Столовая", seatsCount: 30 }],
  });
  const xml = buildFetXml(input, [{
    id: 1,
    source: "REGIME",
    groupId: "group-1",
    studentSetIds: ["group-1", "group-2"],
    subjectId: "breakfast",
    teacherId: null,
    durationInMinutes: 30,
    allowedSlots: [{ dayOfWeek: 1, startTime: 8 * 60 + 30 }],
    roomIds: ["canteen"],
  }]);

  assert.match(xml, /<Number_of_Students>12<\/Number_of_Students>/);
  assert.match(xml, /<Number_of_Students>13<\/Number_of_Students>/);
  assert.match(xml, /<Capacity>30<\/Capacity>/);
  assert.match(xml, /<Students>group-1<\/Students>[\s\S]*<Students>group-2<\/Students>/);
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
  const { activities } = buildFullActivities(input, []);
  const xml = buildFetXml(input, activities);

  assert.match(xml, /<Year>[\s\S]*<Name>class-1<\/Name>[\s\S]*<Group>[\s\S]*<Name>subgroup-1<\/Name>[\s\S]*<\/Group>[\s\S]*<\/Year>/);
});

test("FET XML can include compact student day preference for full pass", () => {
  const xml = buildFetXml(createInput(), buildRegimeActivities(createInput()).slice(0, 1), {
    includeStudentGapConstraints: true,
  });

  assert.match(xml, /<ConstraintStudentsMaxGapsPerDay>/);
  assert.match(xml, /<ConstraintStudentsMaxGapsPerDay>[\s\S]*<Weight_Percentage>100<\/Weight_Percentage>/);
  assert.match(xml, /<ConstraintStudentsMaxGapsPerWeek>/);
  assert.match(xml, /<Max_Gaps>0<\/Max_Gaps>/);
});

test("FET XML treats missing teacher availability as unavailable time", () => {
  const { activities } = buildFullActivities(createInput(), []);
  const xml = buildFetXml(createInput(), activities.slice(0, 1));

  assert.match(xml, /<ConstraintTeacherNotAvailableTimes>/);
  assert.match(xml, /<Teacher>teacher-1<\/Teacher>/);
  assert.match(xml, /<Day>Monday<\/Day>/);
  assert.match(xml, /<Hour>08:00<\/Hour>/);
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
        create: async () => {
          insertedCount += 1;
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
    readActivitiesXml: async (filePath) => filePath === "regime.xml" ? activityXml([1, 2, 3, 4, 5]) : activityXml([1, 2, 3, 4, 5]),
  });

  assert.equal(calls.length, 2);
  assert.equal(deleted, true);
  assert.equal(insertedCount, 5);
  assert.equal(result.deletedTemplateCount, 3);
  assert.equal(result.insertedTemplateCount, 5);
});

test("failed regime pass does not run full pass and does not touch DB", async () => {
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
  assert.equal(calls[0].kind, "regime");
  assert.equal(touchedDb, false);
});
