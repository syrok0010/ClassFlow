import { format } from "date-fns";

import type { ScheduleViewMode } from "@/features/schedule/lib/types";
import { getStudentScheduleEvents } from "@/features/schedule/student/get-student-schedule-events";
import type { StudentScheduleEvent } from "@/features/schedule/student/student-schedule-types";
import { getUserFullName } from "@/lib/auth-access";
import { prisma } from "@/lib/prisma";
import { requireParentActor } from "@/lib/server-action-auth";

export interface GetParentSchedulePageDataParams {
  anchorDate: Date;
  viewMode: ScheduleViewMode;
  requestedStudentId?: string;
}

export interface ParentScheduleChild {
  id: string;
  fullName: string;
  className: string | null;
  label: string;
}

export interface ParentSchedulePageData {
  anchorDate: Date;
  dateParam: string;
  viewMode: ScheduleViewMode;
  selectedStudentId: string | null;
  children: ParentScheduleChild[];
  events: StudentScheduleEvent[];
}

const CHILD_WITHOUT_NAME_LABEL = "Ученик без имени";
const CHILD_WITHOUT_CLASS_LABEL = "Без класса";
const collator = new Intl.Collator("ru");

function compareStudents(left: ParentScheduleChild, right: ParentScheduleChild) {
  const nameComparison = collator.compare(left.fullName, right.fullName);

  if (nameComparison !== 0) {
    return nameComparison;
  }

  const classComparison = collator.compare(left.className ?? "", right.className ?? "");

  if (classComparison !== 0) {
    return classComparison;
  }

  return collator.compare(left.id, right.id);
}

export async function getParentSchedulePageData({
  anchorDate,
  viewMode,
  requestedStudentId,
}: GetParentSchedulePageDataParams): Promise<ParentSchedulePageData> {
  const actor = await requireParentActor();
  const dateParam = format(anchorDate, "yyyy-MM-dd");

  const studentParents = await prisma.studentParents.findMany({
    where: {
      parentId: actor.parentId,
    },
    select: {
      student: {
        select: {
          id: true,
          user: {
            select: {
              surname: true,
              name: true,
              patronymicName: true,
            },
          },
          studentGroups: {
            where: {
              group: {
                type: "CLASS",
              },
            },
            select: {
              group: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });


  const children = studentParents
    .map((row) => {
      const classNames = row.student.studentGroups
        .map((membership) => membership.group.name)
        .sort((first, second) => collator.compare(first, second));
      const fullName = getUserFullName(row.student.user) || CHILD_WITHOUT_NAME_LABEL;
      const className = classNames[0] ?? null;

      return {
        id: row.student.id,
        fullName,
        className,
        label: buildChildLabel(fullName, className),
      };
    })
    .sort(compareStudents);

  if (children.length === 0) {
    return {
      anchorDate,
      dateParam,
      viewMode,
      selectedStudentId: null,
      children: [],
      events: [],
    };
  }

  const selectedStudentId = children.some((child) => child.id === requestedStudentId)
    ? requestedStudentId ?? children[0].id
    : children[0].id;
  const schedule = await getStudentScheduleEvents({
    studentId: selectedStudentId,
    anchorDate,
    viewMode,
  });

  return {
    anchorDate,
    dateParam,
    viewMode,
    selectedStudentId,
    children,
    events: schedule.events,
  };
}

function buildChildLabel(fullName: string, className: string | null): string {
  return `${fullName} · ${className ?? CHILD_WITHOUT_CLASS_LABEL}`;
}
