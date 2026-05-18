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
}

export interface AdminSchedulePageData {
  events: AdminScheduleEvent[];
  classRows: AdminScheduleClassRow[];
  subjectOptions: { id: string; name: string; type: SubjectType }[];
  directGroupOptions: { id: string; name: string; type: GroupType; subjectId: string | null }[];
  electiveGroupOptions: { id: string; name: string; subjectId: string | null }[];
  roomOptions: { id: string; name: string }[];
  teacherOptions: { id: string; name: string }[];
  lessonDurationByGroupSubject: Record<string, number>;
}
