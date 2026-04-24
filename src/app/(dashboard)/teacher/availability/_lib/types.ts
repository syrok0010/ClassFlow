import type {
  AvailabilityOverrideEntry,
  AvailabilityTeacher,
  AvailabilityTemplateEntry,
} from "@/features/availability/lib/types";

export type TeacherAvailabilitySelf = AvailabilityTeacher;

export type TeacherAvailabilityPageData = {
  weekStart: Date;
  weekEnd: Date;
  teacher: TeacherAvailabilitySelf;
};

export type TeacherAvailabilityEntry = AvailabilityTemplateEntry;
export type TeacherAvailabilityOverride = AvailabilityOverrideEntry;
