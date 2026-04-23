import type { AvailabilityType } from "@/generated/prisma/enums";

export type AvailabilityTemplateEntry = {
  id: string;
  dayOfWeek: number;
  startTime: number;
  endTime: number;
  type: AvailabilityType;
};

export type AvailabilityOverrideEntry = {
  id: string;
  startTime: Date;
  endTime: Date;
  type: AvailabilityType;
};

export type AvailabilityTeacher = {
  teacherId: string;
  userId: string;
  fullName: string;
  email: string | null;
  templateEntries: AvailabilityTemplateEntry[];
  overrides: AvailabilityOverrideEntry[];
};

export type AdminAvailabilityWeekData = {
  weekStart: Date;
  weekEnd: Date;
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
};

export type SlotBreakdown = {
  available: SlotTeacherState[];
  unavailable: SlotTeacherState[];
  unmarked: SlotTeacherState[];
};
