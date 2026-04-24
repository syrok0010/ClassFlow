import type { BaseScheduleEvent } from "@/features/schedule";
import type { GroupType, SubjectType } from "@/generated/prisma/enums";

export interface AdminScheduleEvent extends BaseScheduleEvent {
  templateId: string;
  groupId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
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
}

export interface AdminSchedulePageData {
  events: AdminScheduleEvent[];
  classRows: AdminScheduleClassRow[];
  subjectOptions: { id: string; name: string }[];
  groupOptions: { id: string; name: string; type: GroupType }[];
  roomOptions: { id: string; name: string }[];
  teacherOptions: { id: string; name: string }[];
  lessonDurationByGroupSubject: Record<string, number>;
}
