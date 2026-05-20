import type { BaseScheduleEvent } from "@/features/schedule";
import type { AttendanceLoadMode, GroupType, SubjectType } from "@/generated/prisma/enums";

import type {
  ScheduleConflictLinkedClass,
  ScheduleConflictProjectionInput,
} from "./schedule-conflicts";

export interface AdminScheduleEvent extends BaseScheduleEvent, ScheduleConflictProjectionInput {
  classId: string;
  className: string;
  groupType: GroupType;
  timeLabel: string;
  metaLine: string;
}

export interface AdminScheduleClassRow {
  id: string;
  name: string;
  grade: number | null;
  studentCount: number;
  subjectIds: string[];
}

export interface AdminScheduleGroupOption {
  id: string;
  name: string;
  type: GroupType;
  subjectId: string | null;
  parentId: string | null;
  grade: number | null;
  studentCount: number;
  subjectIds: string[];
}

export interface AdminScheduleElectiveGroupOption {
  id: string;
  name: string;
  subjectId: string | null;
  studentCount: number;
  subjectIds: string[];
}

export interface AdminScheduleRoomOption {
  id: string;
  name: string;
  seatsCount: number;
  subjectIds: string[];
}

export type { ScheduleConflictLinkedClass };

export interface AdminScheduleTeacherOption {
  id: string;
  name: string;
  subjects: Array<{
    subjectId: string;
    minGrade: number | null;
    maxGrade: number | null;
  }>;
}

export interface AdminSchedulePageData {
  events: AdminScheduleEvent[];
  classRows: AdminScheduleClassRow[];
  subjectOptions: { id: string; name: string; type: SubjectType; defaultAttendanceLoadMode: AttendanceLoadMode }[];
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  roomOptions: AdminScheduleRoomOption[];
  teacherOptions: AdminScheduleTeacherOption[];
  lessonDurationByGroupSubject: Record<string, number>;
}
