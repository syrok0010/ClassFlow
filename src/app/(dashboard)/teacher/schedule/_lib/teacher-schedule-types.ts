import type { BaseScheduleEvent, ScheduleViewMode } from "@/features/schedule";
import type { GroupType, SubjectType } from "@/generated/prisma/enums";

export type TeacherScheduleEventStatus =
  | "scheduled"
  | "updated"
  | "substitution"
  | "ad_hoc";

export interface TeacherScheduleEvent extends BaseScheduleEvent {
  subjectName: string;
  subjectType: SubjectType;
  subjectTypeLabel: string;
  groupName: string;
  groupType: GroupType;
  roomName: string;
  timeLabel: string;
  metaLine: string;
  status: TeacherScheduleEventStatus;
  statusLabel: string;
}

export interface TeacherSchedulePageData {
  anchorDate: Date;
  dateParam: string;
  viewMode: ScheduleViewMode;
  events: TeacherScheduleEvent[];
}
