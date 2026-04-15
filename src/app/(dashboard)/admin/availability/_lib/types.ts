import type { AvailabilityType } from "@/generated/prisma/enums";

export type AvailabilityTemplateEntry = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  type: AvailabilityType;
};

export type AvailabilityOverrideEntry = {
  id: string;
  startTime: string;
  endTime: string;
  type: AvailabilityType;
};

export type AvailabilityScheduleEntry = {
  id: string;
  startTime: string;
  endTime: string;
  groupName: string;
  subjectName: string;
};

export type AvailabilityTeacher = {
  teacherId: string;
  userId: string;
  fullName: string;
  email: string | null;
  templateEntries: AvailabilityTemplateEntry[];
  overrides: AvailabilityOverrideEntry[];
  scheduleEntries: AvailabilityScheduleEntry[];
};

export type AdminAvailabilityWeekData = {
  weekStart: string;
  weekEnd: string;
  teachers: AvailabilityTeacher[];
};

export type DayConfig = {
  dayOfWeek: number;
  shortLabel: string;
  label: string;
};

export type SlotTeacherState = {
  teacherId: string;
  teacherName: string;
  state: "free" | "busy" | "unavailable" | "unmarked";
  lessonLabel?: string;
};

export type SlotBreakdown = {
  free: SlotTeacherState[];
  busy: SlotTeacherState[];
  unavailable: SlotTeacherState[];
  unmarked: SlotTeacherState[];
};
