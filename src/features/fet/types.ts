import type { AvailabilityType, GroupType, SubjectType } from "@/generated/prisma/enums";

export type FetDayOfWeek = 1 | 2 | 3 | 4 | 5;

export type FetTimeSlot = {
  dayOfWeek: FetDayOfWeek;
  startTime: number;
};

export type FetActivitySource = "REGIME" | "ORDINARY" | "LOCKED_REGIME";

export type FetActivity = {
  id: number;
  source: FetActivitySource;
  groupId: string;
  subjectId: string;
  teacherId: string | null;
  durationInMinutes: number;
  allowedSlots: FetTimeSlot[];
  timeConstraintWeight?: number;
  roomIds: string[];
  fixedSlot?: FetTimeSlot;
  fixedRoomId?: string | null;
};

export type FetImportedActivity = {
  activityId: number;
  dayOfWeek: FetDayOfWeek;
  startTime: number;
  roomId: string | null;
};

export type FetTemplateRow = {
  dayOfWeek: number;
  startTime: number;
  endTime: number;
  groupId: string;
  roomId: string | null;
  teacherId: string | null;
  subjectId: string;
};

export type FetGroup = {
  id: string;
  name: string;
  type: GroupType;
  grade: number | null;
  parentId: string | null;
};

export type FetSubject = {
  id: string;
  name: string;
  type: SubjectType;
};

export type FetRequirement = {
  groupId: string;
  subjectId: string;
  lessonsPerWeek: number;
  durationInMinutes: number;
  breakDuration: number;
  group: FetGroup;
  subject: FetSubject;
};

export type FetTeacherSubject = {
  teacherId: string;
  subjectId: string;
  minGrade: number | null;
  maxGrade: number | null;
};

export type FetTeacherAvailability = {
  teacherId: string;
  dayOfWeek: number;
  startTime: number | Date;
  endTime: number | Date;
  type: AvailabilityType;
};

export type FetRoom = {
  id: string;
  name: string;
};

export type FetRoomSubject = {
  roomId: string;
  subjectId: string;
};

export type FetInput = {
  requirements: FetRequirement[];
  regimeRequirements: FetRequirement[];
  lessonRequirements: FetRequirement[];
  groups: FetGroup[];
  subjects: FetSubject[];
  teacherSubjects: FetTeacherSubject[];
  teacherAvailabilities: FetTeacherAvailability[];
  rooms: FetRoom[];
  roomSubjects: FetRoomSubject[];
};

export type GenerateWeeklyScheduleTemplateInput = {
  replaceExisting: true;
};

export type GenerateWeeklyScheduleTemplateResult = {
  deletedTemplateCount: number;
  insertedTemplateCount: number;
  regimeActivityCount: number;
  ordinaryActivityCount: number;
  warnings: string[];
  artifactId: string;
};

export type FetRunKind = "regime" | "full";

export type FetRunRequest = {
  kind: FetRunKind;
  artifactId: string;
  activities: FetActivity[];
  input: FetInput;
};

export type FetRunResult = {
  artifactDir: string;
  outputActivitiesXmlPath: string;
  warnings: string[];
};
