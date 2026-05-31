import { format } from "date-fns";

import type {
  AttendanceLoadMode,
  GroupType,
  ScheduleDeliveryMode,
  SubjectType,
} from "@/generated/prisma/enums";

import type { AdminScheduleEvent } from "./admin-schedule-types";
import type { ScheduleConflictLinkedClass } from "./schedule-conflicts";

export type RequirementMeta = {
  lessonsPerWeek: number;
  breakDuration: number;
};

export type ScheduleProjectionLinkedClass = ScheduleConflictLinkedClass & {
  type: GroupType;
};

export type ScheduleProjectionGroup = ScheduleProjectionLinkedClass & {
  subjectId: string | null;
  parentGroup: ScheduleProjectionLinkedClass | null;
};

export type ScheduleProjectionSource = {
  id: string;
  deliveryMode: ScheduleDeliveryMode;
  deliveryGroup: ScheduleProjectionGroup | null;
  openClasses: ScheduleProjectionLinkedClass[];
  coveredClasses: ScheduleProjectionLinkedClass[];
  start: Date;
  end: Date;
  dayOfWeek: number | null;
  startMinutes: number | null;
  endMinutes: number | null;
  detached: boolean;
  subjectId: string;
  subjectName: string;
  subjectType: SubjectType;
  attendanceLoadMode: AttendanceLoadMode;
  teacherId: string | null;
  teacherName: string;
  roomId: string | null;
  roomName: string;
  roomSeatsCount: number | null;
};

type CountedGroupRecord = {
  id: string;
  name: string;
  grade: number | null;
  type: GroupType;
  _count?: { studentGroups: number };
};

type DeliveryGroupRecord = CountedGroupRecord & {
  subjectId?: string | null;
  parentGroup?: CountedGroupRecord | null;
};

type ScheduleAudience = {
  projectedClasses: ScheduleProjectionLinkedClass[];
  openClasses: ScheduleProjectionLinkedClass[];
  coveredClasses: ScheduleProjectionLinkedClass[];
  parentClass: ScheduleProjectionLinkedClass | null;
  groupName: string;
};

export function mapScheduleGroupToLinkedClass(
  group: CountedGroupRecord,
): ScheduleProjectionLinkedClass {
  return {
    id: group.id,
    name: group.name,
    grade: group.grade ?? null,
    studentCount: group._count?.studentGroups ?? 0,
    type: group.type,
  };
}

export function mapScheduleDeliveryGroup(
  group: DeliveryGroupRecord | null,
): ScheduleProjectionGroup | null {
  if (!group) {
    return null;
  }

  return {
    ...mapScheduleGroupToLinkedClass(group),
    subjectId: group.subjectId ?? null,
    parentGroup: group.parentGroup
      ? mapScheduleGroupToLinkedClass(group.parentGroup)
      : null,
  };
}

export function mapScheduleProjectionSourceToAdminEvents(
  source: ScheduleProjectionSource,
  requirementMetaByGroupSubject: Record<string, RequirementMeta> = {},
): AdminScheduleEvent[] {
  const audience = resolveScheduleAudience(source);
  const timeLabel = source.detached
    ? "Без времени"
    : `${format(source.start, "HH:mm")}-${format(source.end, "HH:mm")}`;

  return audience.projectedClasses.map((projectedClass) => {
    const requirementGroupId = getRequirementMetaGroupId(source, projectedClass.id);
    const requirementMeta = requirementGroupId
      ? requirementMetaByGroupSubject[`${requirementGroupId}:${source.subjectId}`] ?? null
      : null;

    return {
      id: `${source.id}:${projectedClass.id}`,
      templateId: source.id,
      projectionClassId: projectedClass.id,
      deliveryMode: source.deliveryMode,
      deliveryGroupId: source.deliveryGroup?.id ?? null,
      deliveryGroupType: source.deliveryGroup?.type ?? null,
      openClassIds: audience.openClasses.map((item) => item.id),
      coveredClassIds: audience.coveredClasses.map((item) => item.id),
      openClasses: audience.openClasses,
      coveredClasses: audience.coveredClasses,
      start: source.start,
      end: source.end,
      dayOfWeek: source.dayOfWeek,
      startMinutes: source.startMinutes,
      endMinutes: source.endMinutes,
      detached: source.detached,
      subjectId: source.subjectId,
      subjectName: source.subjectName,
      subjectType: source.subjectType,
      attendanceLoadMode: source.attendanceLoadMode,
      teacherId: source.teacherId,
      teacherName: source.teacherName,
      roomId: source.roomId,
      roomName: source.roomName,
      roomSeatsCount: source.roomSeatsCount,
      groupName: audience.groupName,
      deliveryGroupStudentCount: source.deliveryGroup?.studentCount ?? null,
      parentClassId: audience.parentClass?.id ?? null,
      parentClassName: audience.parentClass?.name ?? null,
      parentClassGrade: audience.parentClass?.grade ?? null,
      parentClassStudentCount: audience.parentClass?.studentCount ?? null,
      minimumBreakAfterMinutes: requirementMeta?.breakDuration ?? null,
      classId: projectedClass.id,
      className: projectedClass.name,
      groupType: source.deliveryGroup?.type ?? projectedClass.type,
      timeLabel,
      metaLine: `${source.teacherName} • ${source.roomName}`,
    };
  });
}

function resolveScheduleAudience(source: ScheduleProjectionSource): ScheduleAudience {
  const openClasses = sortClassesByName(source.openClasses);
  const coveredClasses = sortClassesByName(source.coveredClasses);

  if (source.deliveryMode === "SHARED_CLASSES") {
    return {
      projectedClasses: coveredClasses,
      openClasses,
      coveredClasses,
      parentClass: null,
      groupName: coveredClasses.map((item) => item.name).join(" + "),
    };
  }

  if (source.deliveryMode === "ELECTIVE_GROUP") {
    return {
      projectedClasses: openClasses,
      openClasses,
      coveredClasses,
      parentClass: null,
      groupName: source.deliveryGroup?.name ?? "Группа не указана",
    };
  }

  if (!source.deliveryGroup) {
    return {
      projectedClasses: [],
      openClasses,
      coveredClasses,
      parentClass: null,
      groupName: "Группа не указана",
    };
  }

  const projectedClass =
    source.deliveryGroup.type === "SUBJECT_SUBGROUP" && source.deliveryGroup.parentGroup
      ? source.deliveryGroup.parentGroup
      : source.deliveryGroup;
  const parentClass =
    source.deliveryGroup.type === "SUBJECT_SUBGROUP" && source.deliveryGroup.parentGroup
      ? source.deliveryGroup.parentGroup
      : source.deliveryGroup.type === "CLASS"
        ? source.deliveryGroup
        : null;

  return {
    projectedClasses: [projectedClass],
    openClasses,
    coveredClasses,
    parentClass,
    groupName: source.deliveryGroup.name,
  };
}

function getRequirementMetaGroupId(
  source: ScheduleProjectionSource,
  projectedClassId: string,
) {
  if (source.deliveryMode === "SHARED_CLASSES") {
    return projectedClassId;
  }

  if (source.deliveryGroup?.type === "SUBJECT_SUBGROUP") {
    return source.deliveryGroup.parentGroup?.id ?? source.deliveryGroup.id;
  }

  return source.deliveryGroup?.id ?? null;
}

function sortClassesByName<T extends { name: string }>(classes: T[]) {
  return [...classes].sort((left, right) => left.name.localeCompare(right.name, "ru"));
}
