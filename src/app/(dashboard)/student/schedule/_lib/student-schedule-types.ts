import type {
  BaseScheduleEvent,
  ReadonlyScheduleEmptyState,
  ScheduleViewMode,
} from "@/features/schedule";
import type { GroupType, SubjectType } from "@/generated/prisma/enums";

export interface StudentScheduleEvent extends BaseScheduleEvent {
  subjectName: string;
  subjectType: SubjectType;
  teacherName: string;
  roomName: string;
  groupName: string;
  groupType: GroupType;
  timeLabel: string;
  metaLine: string;
}

export interface StudentSchedulePageData {
  anchorDate: Date;
  dateParam: string;
  viewMode: ScheduleViewMode;
  events: StudentScheduleEvent[];
  emptyState: ReadonlyScheduleEmptyState;
}
