import type { BaseScheduleEvent } from "@/features/schedule";
import type { GroupType, SubjectType } from "@/generated/prisma/enums";

export interface AdminScheduleEvent extends BaseScheduleEvent {
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
  anchorDate: Date;
  events: AdminScheduleEvent[];
  classRows: AdminScheduleClassRow[];
}
