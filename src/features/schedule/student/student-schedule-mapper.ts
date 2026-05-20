import { format } from "date-fns";

import type { GroupType, SubjectType } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { getUserFullName } from "@/lib/auth-access";

import type { StudentScheduleEvent } from "./student-schedule-types";

export const studentScheduleEntryInclude = {
  subject: { select: { id: true, name: true, type: true } },
  teacher: {
    select: {
      id: true,
      user: { select: { surname: true, name: true, patronymicName: true } },
    },
  },
  room: { select: { id: true, name: true } },
  deliveryGroup: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
  coveredClasses: {
    select: {
      schoolClass: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  },
} satisfies Prisma.ScheduleEntryInclude;

export type StudentScheduleEntryRecord = Prisma.ScheduleEntryGetPayload<{
  include: typeof studentScheduleEntryInclude;
}>;

const MISSING_TEACHER_LABEL = "Преподаватель не назначен";
const MISSING_ROOM_LABEL = "Кабинет не указан";

export function mapScheduleEntryToStudentScheduleEvent(
  entry: StudentScheduleEntryRecord
): StudentScheduleEvent {
  const teacherName = entry.teacher?.user
    ? getUserFullName(entry.teacher.user) || MISSING_TEACHER_LABEL
    : MISSING_TEACHER_LABEL;
  const roomName = entry.room?.name ?? MISSING_ROOM_LABEL;
  const coveredClassNames = entry.coveredClasses.map((item) => item.schoolClass.name).sort((left, right) => left.localeCompare(right, "ru"));
  const groupName = entry.deliveryGroup?.name ?? coveredClassNames.join(" + ");
  const groupType = entry.deliveryGroup?.type ?? "CLASS";

  return {
    id: entry.id,
    start: entry.startTime,
    end: entry.endTime,
    subjectName: entry.subject.name,
    subjectType: entry.subject.type as SubjectType,
    teacherName,
    roomName,
    groupName,
    groupType: groupType as GroupType,
    timeLabel: `${format(entry.startTime, "HH:mm")}-${format(entry.endTime, "HH:mm")}`,
    metaLine: `${teacherName} • ${roomName}`,
  };
}
