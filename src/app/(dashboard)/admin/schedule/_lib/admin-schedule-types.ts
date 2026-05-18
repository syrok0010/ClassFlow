import type { BaseScheduleEvent } from "@/features/schedule";
import type { GroupType, ScheduleDeliveryMode, SubjectType } from "@/generated/prisma/enums";

export interface AdminScheduleEvent extends BaseScheduleEvent {
  id: string;
  templateId: string;
  projectionClassId: string;
  deliveryMode: ScheduleDeliveryMode;
  deliveryGroupId: string | null;
  deliveryGroupType: GroupType | null;
  openClassIds: string[];
  coveredClassIds: string[];
  dayOfWeek: number | null;
  startMinutes: number | null;
  endMinutes: number | null;
  detached: boolean;
  subjectId: string;
  teacherId: string | null;
  roomId: string | null;
  classId: string;
  className: string;
  groupName: string;
  groupType: GroupType;
  subjectName: string;
  subjectType: SubjectType;
  teacherName: string;
  roomName: string;
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
  subjectOptions: { id: string; name: string; type: SubjectType }[];
  directGroupOptions: AdminScheduleGroupOption[];
  electiveGroupOptions: AdminScheduleElectiveGroupOption[];
  roomOptions: AdminScheduleRoomOption[];
  teacherOptions: AdminScheduleTeacherOption[];
  lessonDurationByGroupSubject: Record<string, number>;
}
