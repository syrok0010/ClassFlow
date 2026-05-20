import type {
  AttendanceLoadMode,
  GroupType,
  ScheduleDeliveryMode,
  SubjectType,
} from "@/generated/prisma/enums";

import { getExpectedScheduleAudienceSize } from "./schedule-load-policy";

export type ScheduleConflictSeverity = "hard" | "warning";
export type ScheduleConflictField = "time" | "subject" | "group" | "room" | "teacher";

export type ScheduleConflictCode =
  | "TEACHER_TIME_OVERLAP"
  | "ROOM_TIME_OVERLAP"
  | "ACADEMIC_ELECTIVE_OVERLAP"
  | "AUDIENCE_DIRECT_CLASS_OVERLAP"
  | "AUDIENCE_DIRECT_SUBGROUP_OVERLAP"
  | "AUDIENCE_SUBGROUP_PARENT_CLASS_OVERLAP"
  | "AUDIENCE_SHARED_CLASSES_OVERLAP"
  | "AUDIENCE_SHARED_DIRECT_CLASS_OVERLAP"
  | "AUDIENCE_SHARED_DIRECT_SUBGROUP_OVERLAP"
  | "AUDIENCE_ELECTIVE_GROUP_OVERLAP"
  | "ROOM_CAPACITY_OVERFLOW"
  | "MULTIPLE_SUBJECT_TEACHERS_ASSIGNED";

export type ScheduleConflictLinkedClass = {
  id: string;
  name: string;
  grade: number | null;
  studentCount: number;
};

export interface ScheduleConflictProjectionInput {
  id: string;
  templateId: string;
  projectionClassId: string;
  deliveryMode: ScheduleDeliveryMode;
  deliveryGroupId: string | null;
  deliveryGroupType: GroupType | null;
  openClassIds: string[];
  coveredClassIds: string[];
  openClasses: ScheduleConflictLinkedClass[];
  coveredClasses: ScheduleConflictLinkedClass[];
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
  groupName: string;
  deliveryGroupStudentCount: number | null;
  parentClassId: string | null;
  parentClassName: string | null;
  parentClassGrade: number | null;
  parentClassStudentCount: number | null;
}

export interface ScheduleConflict {
  code: ScheduleConflictCode;
  severity: ScheduleConflictSeverity;
  message: string;
  fields: ScheduleConflictField[];
  affectedTemplateIds: string[];
  affectedProjectionIds: string[];
  relatedTemplateIds: string[];
  relatedProjectionIds: string[];
  classIds?: string[];
  teacherId?: string | null;
  roomId?: string | null;
  deliveryGroupId?: string | null;
  expectedAudienceSize?: number;
  roomSeatsCount?: number | null;
}

export interface ScheduleConflictAnalysisResult {
  conflicts: ScheduleConflict[];
  hardConflicts: ScheduleConflict[];
  hasHardConflicts: boolean;
  conflictsByTemplateId: Map<string, ScheduleConflict[]>;
  conflictsByProjectionId: Map<string, ScheduleConflict[]>;
}

type ScheduleConflictItem = Omit<ScheduleConflictProjectionInput, "id" | "projectionClassId"> & {
  projectionIds: string[];
  projectionClassIds: string[];
};

export function analyzeScheduleTemplateConflicts(
  projections: readonly ScheduleConflictProjectionInput[],
): ScheduleConflictAnalysisResult {
  const items = collapseScheduleConflictProjections(projections);
  const conflicts: ScheduleConflict[] = [];

  for (const item of items) {
    const capacityConflict = analyzeRoomCapacityConflict(item);

    if (capacityConflict) {
      conflicts.push(capacityConflict);
    }
  }

  for (let index = 0; index < items.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < items.length; nextIndex += 1) {
      conflicts.push(...analyzePairConflicts(items[index], items[nextIndex]));
    }
  }

  conflicts.push(...analyzeSubjectTeacherConsistencyWarnings(items));

  return buildScheduleConflictAnalysis(conflicts);
}

export function validateScheduleTemplateRollout(
  projections: readonly ScheduleConflictProjectionInput[],
) {
  const analysis = analyzeScheduleTemplateConflicts(projections);

  return {
    ...analysis,
    isValid: !analysis.hasHardConflicts,
  };
}

export function getScheduleConflictLevel(conflicts: readonly ScheduleConflict[]) {
  if (conflicts.some((conflict) => conflict.severity === "hard")) {
    return "hard" as const;
  }

  if (conflicts.some((conflict) => conflict.severity === "warning")) {
    return "warning" as const;
  }

  return "none" as const;
}

export function getScheduleConflictFieldSeverities(
  conflicts: readonly ScheduleConflict[],
) {
  const severities = new Map<ScheduleConflictField, ScheduleConflictSeverity>();

  for (const conflict of conflicts) {
    for (const field of conflict.fields) {
      const previous = severities.get(field);

      if (previous === "hard" || conflict.severity === previous) {
        continue;
      }

      severities.set(field, conflict.severity);
    }
  }

  return severities;
}

function collapseScheduleConflictProjections(
  projections: readonly ScheduleConflictProjectionInput[],
) {
  const itemsByTemplateId = new Map<string, ScheduleConflictItem>();

  for (const projection of projections) {
    const existing = itemsByTemplateId.get(projection.templateId);

    if (!existing) {
      itemsByTemplateId.set(projection.templateId, {
        ...projection,
        openClassIds: toSortedUnique(projection.openClassIds),
        coveredClassIds: toSortedUnique(projection.coveredClassIds),
        openClasses: toSortedClasses(projection.openClasses),
        coveredClasses: toSortedClasses(projection.coveredClasses),
        projectionIds: [projection.id],
        projectionClassIds: [projection.projectionClassId],
      });
      continue;
    }

    existing.projectionIds = toSortedUnique([...existing.projectionIds, projection.id]);
    existing.projectionClassIds = toSortedUnique([
      ...existing.projectionClassIds,
      projection.projectionClassId,
    ]);
  }

  return Array.from(itemsByTemplateId.values()).sort((left, right) =>
    left.templateId.localeCompare(right.templateId, "ru"),
  );
}

function analyzeRoomCapacityConflict(item: ScheduleConflictItem): ScheduleConflict | null {
  if (!hasScheduledTime(item) || !item.roomId || item.roomSeatsCount === null) {
    return null;
  }

  const expectedAudienceSize = getExpectedAudienceForConflict(item);

  if (expectedAudienceSize === null || expectedAudienceSize <= item.roomSeatsCount) {
    return null;
  }

  return createConflict({
    code: "ROOM_CAPACITY_OVERFLOW",
    severity: "hard",
    message: `В кабинете ${item.roomName} не хватает мест: расчетная аудитория ${expectedAudienceSize}, вместимость ${item.roomSeatsCount}.`,
    fields: ["room", "group"],
    affectedItems: [item],
    relatedItems: [item],
    roomId: item.roomId,
    deliveryGroupId: item.deliveryGroupId,
    classIds: getConflictClassIds(item),
    expectedAudienceSize,
    roomSeatsCount: item.roomSeatsCount,
  });
}

function analyzePairConflicts(left: ScheduleConflictItem, right: ScheduleConflictItem) {
  if (!hasTimeOverlap(left, right)) {
    return [] as ScheduleConflict[];
  }

  const conflicts: ScheduleConflict[] = [];

  if (left.teacherId && left.teacherId === right.teacherId) {
    conflicts.push(createConflict({
      code: "TEACHER_TIME_OVERLAP",
      severity: "hard",
      message: `Учитель ${left.teacherName} назначен одновременно на ${formatConflictCardLabel(left)} и ${formatConflictCardLabel(right)}.`,
      fields: ["time", "teacher"],
      affectedItems: [left, right],
      relatedItems: [left, right],
      teacherId: left.teacherId,
    }));
  }

  if (left.roomId && left.roomId === right.roomId) {
    conflicts.push(createConflict({
      code: "ROOM_TIME_OVERLAP",
      severity: "hard",
      message: `Кабинет ${left.roomName} занят одновременно для ${formatConflictCardLabel(left)} и ${formatConflictCardLabel(right)}.`,
      fields: ["time", "room"],
      affectedItems: [left, right],
      relatedItems: [left, right],
      roomId: left.roomId,
    }));
  }

  const academicElectiveConflict = analyzeAcademicElectiveConflict(left, right);

  if (academicElectiveConflict) {
    conflicts.push(academicElectiveConflict);
  }

  const audienceConflict = analyzeAudienceConflict(left, right);

  if (audienceConflict) {
    conflicts.push(audienceConflict);
  }

  return conflicts;
}

function analyzeAudienceConflict(
  left: ScheduleConflictItem,
  right: ScheduleConflictItem,
): ScheduleConflict | null {
  // openClassIds intentionally do not participate in hard conflicts:
  // "открыто для класса" means availability, not guaranteed attendance.
  if (
    isElectiveGroup(left)
    && isElectiveGroup(right)
    && left.deliveryGroupId
    && left.deliveryGroupId === right.deliveryGroupId
  ) {
    return createConflict({
      code: "AUDIENCE_ELECTIVE_GROUP_OVERLAP",
      severity: "hard",
      message: `Группа по выбору ${left.groupName} назначена одновременно на ${formatConflictCardLabel(left)} и ${formatConflictCardLabel(right)}.`,
      fields: ["time", "group"],
      affectedItems: [left, right],
      relatedItems: [left, right],
      deliveryGroupId: left.deliveryGroupId,
    });
  }

  if (isDirectWholeClass(left) && isDirectWholeClass(right) && left.parentClassId === right.parentClassId) {
    const classId = left.parentClassId;
    const className = left.parentClassName ?? right.parentClassName ?? left.groupName;

    return createConflict({
      code: "AUDIENCE_DIRECT_CLASS_OVERLAP",
      severity: "hard",
      message: `Класс ${className} назначен одновременно на ${formatConflictCardLabel(left)} и ${formatConflictCardLabel(right)}.`,
      fields: ["time", "group"],
      affectedItems: [left, right],
      relatedItems: [left, right],
      classIds: classId ? [classId] : undefined,
    });
  }

  if (
    isDirectSubgroup(left)
    && isDirectSubgroup(right)
    && left.deliveryGroupId
    && left.deliveryGroupId === right.deliveryGroupId
  ) {
    return createConflict({
      code: "AUDIENCE_DIRECT_SUBGROUP_OVERLAP",
      severity: "hard",
      message: `Подгруппа ${left.groupName} назначена одновременно на ${formatConflictCardLabel(left)} и ${formatConflictCardLabel(right)}.`,
      fields: ["time", "group"],
      affectedItems: [left, right],
      relatedItems: [left, right],
      classIds: left.parentClassId ? [left.parentClassId] : undefined,
      deliveryGroupId: left.deliveryGroupId,
    });
  }

  const subgroupParentConflict = analyzeSubgroupParentClassConflict(left, right);

  if (subgroupParentConflict) {
    return subgroupParentConflict;
  }

  const sharedClassesConflict = analyzeSharedClassesConflict(left, right);

  if (sharedClassesConflict) {
    return sharedClassesConflict;
  }

  const sharedDirectClassConflict = analyzeSharedDirectClassConflict(left, right);

  if (sharedDirectClassConflict) {
    return sharedDirectClassConflict;
  }

  const sharedDirectSubgroupConflict = analyzeSharedDirectSubgroupConflict(left, right);

  if (sharedDirectSubgroupConflict) {
    return sharedDirectSubgroupConflict;
  }

  return null;
}

function analyzeAcademicElectiveConflict(
  left: ScheduleConflictItem,
  right: ScheduleConflictItem,
) {
  if (!isAcademicElectivePair(left, right)) {
    return null;
  }

  const overlappingClasses = intersectClasses(
    getAudienceScopeClasses(left),
    getAudienceScopeClasses(right),
  );

  if (overlappingClasses.length === 0) {
    return null;
  }

  const classNames = overlappingClasses.map((classItem) => classItem.name).join(", ");

  return createConflict({
    code: "ACADEMIC_ELECTIVE_OVERLAP",
    severity: "hard",
    message: `Основной предмет и доп не могут идти одновременно для ${classNames}: ${formatConflictCardLabel(left)} и ${formatConflictCardLabel(right)}.`,
    fields: ["time", "subject", "group"],
    affectedItems: [left, right],
    relatedItems: [left, right],
    classIds: overlappingClasses.map((classItem) => classItem.id),
  });
}

function analyzeSubgroupParentClassConflict(
  left: ScheduleConflictItem,
  right: ScheduleConflictItem,
) {
  const subgroup = isDirectSubgroup(left)
    ? left
    : isDirectSubgroup(right)
      ? right
      : null;
  const wholeClass = isDirectWholeClass(left)
    ? left
    : isDirectWholeClass(right)
      ? right
      : null;

  if (!subgroup || !wholeClass || subgroup.parentClassId !== wholeClass.parentClassId) {
    return null;
  }

  return createConflict({
    code: "AUDIENCE_SUBGROUP_PARENT_CLASS_OVERLAP",
    severity: "hard",
    message: `Подгруппа ${subgroup.groupName} пересекается с занятием всего класса ${wholeClass.parentClassName ?? wholeClass.groupName}: ${formatConflictCardLabel(subgroup)} и ${formatConflictCardLabel(wholeClass)}.`,
    fields: ["time", "group"],
    affectedItems: [left, right],
    relatedItems: [left, right],
    classIds: subgroup.parentClassId ? [subgroup.parentClassId] : undefined,
  });
}

function analyzeSharedClassesConflict(
  left: ScheduleConflictItem,
  right: ScheduleConflictItem,
) {
  if (!isSharedClasses(left) || !isSharedClasses(right)) {
    return null;
  }

  const overlappingClasses = intersectClasses(left.coveredClasses, right.coveredClasses);

  if (overlappingClasses.length === 0) {
    return null;
  }

  const overlappingNames = overlappingClasses.map((classItem) => classItem.name).join(", ");

  return createConflict({
    code: "AUDIENCE_SHARED_CLASSES_OVERLAP",
    severity: "hard",
    message: `Классы ${overlappingNames} входят одновременно в два общих занятия: ${formatConflictCardLabel(left)} и ${formatConflictCardLabel(right)}.`,
    fields: ["time", "group"],
    affectedItems: [left, right],
    relatedItems: [left, right],
    classIds: overlappingClasses.map((classItem) => classItem.id),
  });
}

function analyzeSharedDirectClassConflict(
  left: ScheduleConflictItem,
  right: ScheduleConflictItem,
) {
  const shared = isSharedClasses(left)
    ? left
    : isSharedClasses(right)
      ? right
      : null;
  const wholeClass = isDirectWholeClass(left)
    ? left
    : isDirectWholeClass(right)
      ? right
      : null;

  if (!shared || !wholeClass || !wholeClass.parentClassId || !shared.coveredClassIds.includes(wholeClass.parentClassId)) {
    return null;
  }

  const className = wholeClass.parentClassName ?? wholeClass.groupName;

  return createConflict({
    code: "AUDIENCE_SHARED_DIRECT_CLASS_OVERLAP",
    severity: "hard",
    message: `Класс ${className} входит в общее занятие и одновременно назначен на отдельную карточку: ${formatConflictCardLabel(shared)} и ${formatConflictCardLabel(wholeClass)}.`,
    fields: ["time", "group"],
    affectedItems: [left, right],
    relatedItems: [left, right],
    classIds: [wholeClass.parentClassId],
  });
}

function analyzeSharedDirectSubgroupConflict(
  left: ScheduleConflictItem,
  right: ScheduleConflictItem,
) {
  const shared = isSharedClasses(left)
    ? left
    : isSharedClasses(right)
      ? right
      : null;
  const subgroup = isDirectSubgroup(left)
    ? left
    : isDirectSubgroup(right)
      ? right
      : null;

  if (!shared || !subgroup || !subgroup.parentClassId || !shared.coveredClassIds.includes(subgroup.parentClassId)) {
    return null;
  }

  // SHARED_CLASSES models a whole-class activity for every covered class,
  // so overlapping it with a subgroup of the same parent class is unsafe.
  return createConflict({
    code: "AUDIENCE_SHARED_DIRECT_SUBGROUP_OVERLAP",
    severity: "hard",
    message: `Подгруппа ${subgroup.groupName} пересекается с общим занятием для всего класса ${subgroup.parentClassName ?? "класса"}: ${formatConflictCardLabel(shared)} и ${formatConflictCardLabel(subgroup)}.`,
    fields: ["time", "group"],
    affectedItems: [left, right],
    relatedItems: [left, right],
    classIds: [subgroup.parentClassId],
    deliveryGroupId: subgroup.deliveryGroupId,
  });
}

function analyzeSubjectTeacherConsistencyWarnings(items: readonly ScheduleConflictItem[]) {
  const groups = new Map<string, ScheduleConflictItem[]>();

  for (const item of items) {
    const key = getSubjectTeacherConsistencyKey(item);

    if (!key) {
      continue;
    }

    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }

  const warnings: ScheduleConflict[] = [];

  for (const groupItems of groups.values()) {
    const distinctTeacherIds = toSortedUnique(
      groupItems
        .map((item) => item.teacherId)
        .filter((teacherId): teacherId is string => Boolean(teacherId)),
    );

    if (distinctTeacherIds.length < 2) {
      continue;
    }

    for (const item of groupItems) {
      warnings.push(createConflict({
        code: "MULTIPLE_SUBJECT_TEACHERS_ASSIGNED",
        severity: "warning",
        message: `Для ${item.groupName} предмет ${item.subjectName} ведут разные учителя в разных слотах шаблона.`,
        fields: ["subject", "teacher"],
        affectedItems: [item],
        relatedItems: groupItems,
        deliveryGroupId: item.deliveryGroupId,
        classIds: getConflictClassIds(item),
      }));
    }
  }

  return warnings;
}

function buildScheduleConflictAnalysis(
  conflicts: readonly ScheduleConflict[],
): ScheduleConflictAnalysisResult {
  const conflictsByTemplateId = new Map<string, ScheduleConflict[]>();
  const conflictsByProjectionId = new Map<string, ScheduleConflict[]>();

  for (const conflict of conflicts) {
    for (const templateId of conflict.affectedTemplateIds) {
      const next = conflictsByTemplateId.get(templateId) ?? [];
      next.push(conflict);
      conflictsByTemplateId.set(templateId, next);
    }

    for (const projectionId of conflict.affectedProjectionIds) {
      const next = conflictsByProjectionId.get(projectionId) ?? [];
      next.push(conflict);
      conflictsByProjectionId.set(projectionId, next);
    }
  }

  const hardConflicts = conflicts.filter((conflict) => conflict.severity === "hard");

  return {
    conflicts: [...conflicts],
    hardConflicts,
    hasHardConflicts: hardConflicts.length > 0,
    conflictsByTemplateId,
    conflictsByProjectionId,
  };
}

function createConflict({
  code,
  severity,
  message,
  fields,
  affectedItems,
  relatedItems,
  classIds,
  teacherId,
  roomId,
  deliveryGroupId,
  expectedAudienceSize,
  roomSeatsCount,
}: {
  code: ScheduleConflictCode;
  severity: ScheduleConflictSeverity;
  message: string;
  fields: ScheduleConflictField[];
  affectedItems: readonly ScheduleConflictItem[];
  relatedItems: readonly ScheduleConflictItem[];
  classIds?: string[];
  teacherId?: string | null;
  roomId?: string | null;
  deliveryGroupId?: string | null;
  expectedAudienceSize?: number;
  roomSeatsCount?: number | null;
}): ScheduleConflict {
  return {
    code,
    severity,
    message,
    fields,
    affectedTemplateIds: toSortedUnique(affectedItems.map((item) => item.templateId)),
    affectedProjectionIds: toSortedUnique(affectedItems.flatMap((item) => item.projectionIds)),
    relatedTemplateIds: toSortedUnique(relatedItems.map((item) => item.templateId)),
    relatedProjectionIds: toSortedUnique(relatedItems.flatMap((item) => item.projectionIds)),
    classIds: classIds ? toSortedUnique(classIds) : undefined,
    teacherId,
    roomId,
    deliveryGroupId,
    expectedAudienceSize,
    roomSeatsCount,
  };
}

function getExpectedAudienceForConflict(item: ScheduleConflictItem) {
  if (item.deliveryMode === "SHARED_CLASSES") {
    if (item.coveredClasses.length === 0) {
      return null;
    }

    return getExpectedScheduleAudienceSize(
      {
        deliveryGroupSize: item.coveredClasses.reduce((sum, classItem) => sum + classItem.studentCount, 0),
        fullClassSize: item.coveredClasses.reduce((sum, classItem) => sum + classItem.studentCount, 0),
      },
      item.attendanceLoadMode,
    );
  }

  if (item.deliveryGroupStudentCount === null) {
    return null;
  }

  return getExpectedScheduleAudienceSize(
    {
      deliveryGroupSize: item.deliveryGroupStudentCount,
      fullClassSize: item.parentClassStudentCount ?? item.deliveryGroupStudentCount,
    },
    item.attendanceLoadMode,
  );
}

function getSubjectTeacherConsistencyKey(item: ScheduleConflictItem) {
  if (item.deliveryMode === "SHARED_CLASSES") {
    if (item.coveredClassIds.length === 0) {
      return null;
    }

    return `shared:${item.subjectId}:${item.coveredClassIds.join(",")}`;
  }

  if (!item.deliveryGroupId) {
    return null;
  }

  return `${item.deliveryMode.toLowerCase()}:${item.subjectId}:${item.deliveryGroupId}`;
}

function formatConflictCardLabel(item: ScheduleConflictItem) {
  return `«${item.subjectName}» (${item.groupName}, ${formatConflictTime(item)})`;
}

function formatConflictTime(item: ScheduleConflictItem) {
  if (!hasScheduledTime(item)) {
    return "без времени";
  }

  return `${formatMinutes(item.startMinutes)}-${formatMinutes(item.endMinutes)}`;
}

function formatMinutes(totalMinutes: number | null) {
  if (totalMinutes === null) {
    return "00:00";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function hasTimeOverlap(left: ScheduleConflictItem, right: ScheduleConflictItem) {
  if (left.templateId === right.templateId || !hasScheduledTime(left) || !hasScheduledTime(right)) {
    return false;
  }

  if (left.dayOfWeek !== right.dayOfWeek) {
    return false;
  }

  const leftStart = left.startMinutes;
  const leftEnd = left.endMinutes;
  const rightStart = right.startMinutes;
  const rightEnd = right.endMinutes;

  if (leftStart === null || leftEnd === null || rightStart === null || rightEnd === null) {
    return false;
  }

  return leftStart < rightEnd && rightStart < leftEnd;
}

function hasScheduledTime(item: Pick<ScheduleConflictItem, "detached" | "dayOfWeek" | "startMinutes" | "endMinutes">) {
  return !item.detached
    && item.dayOfWeek !== null
    && item.startMinutes !== null
    && item.endMinutes !== null;
}

function isSharedClasses(item: ScheduleConflictItem) {
  return item.deliveryMode === "SHARED_CLASSES";
}

function isElectiveGroup(item: ScheduleConflictItem) {
  return item.deliveryMode === "ELECTIVE_GROUP";
}

function isDirectSubgroup(item: ScheduleConflictItem) {
  return item.deliveryMode === "DIRECT_GROUP" && item.deliveryGroupType === "SUBJECT_SUBGROUP";
}

function isDirectWholeClass(item: ScheduleConflictItem) {
  return item.deliveryMode === "DIRECT_GROUP" && item.deliveryGroupType === "CLASS";
}

function getConflictClassIds(item: ScheduleConflictItem) {
  if (item.deliveryMode === "SHARED_CLASSES") {
    return item.coveredClassIds;
  }

  if (item.parentClassId) {
    return [item.parentClassId];
  }

  return [];
}

function getAudienceScopeClasses(item: ScheduleConflictItem): ScheduleConflictLinkedClass[] {
  if (item.deliveryMode === "SHARED_CLASSES") {
    return item.coveredClasses;
  }

  if (item.deliveryMode === "ELECTIVE_GROUP") {
    return item.openClasses;
  }

  if (
    item.parentClassId
    && item.parentClassName
    && item.parentClassStudentCount !== null
  ) {
    return [{
      id: item.parentClassId,
      name: item.parentClassName,
      grade: item.parentClassGrade,
      studentCount: item.parentClassStudentCount,
    }];
  }

  return [];
}

function isAcademicElectivePair(left: ScheduleConflictItem, right: ScheduleConflictItem) {
  return (
    (left.subjectType === "ACADEMIC" && isElectiveSubjectType(right.subjectType))
    || (right.subjectType === "ACADEMIC" && isElectiveSubjectType(left.subjectType))
  );
}

function isElectiveSubjectType(subjectType: SubjectType) {
  return subjectType === "ELECTIVE_OPTIONAL" || subjectType === "ELECTIVE_REQUIRED";
}

function intersectClasses(
  left: readonly ScheduleConflictLinkedClass[],
  right: readonly ScheduleConflictLinkedClass[],
) {
  const rightById = new Map(right.map((classItem) => [classItem.id, classItem]));

  return left
    .filter((classItem) => rightById.has(classItem.id))
    .sort((first, second) => first.name.localeCompare(second.name, "ru"));
}

function toSortedUnique(values: readonly string[]) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right, "ru"));
}

function toSortedClasses(classes: readonly ScheduleConflictLinkedClass[]) {
  return [...classes].sort((left, right) => left.name.localeCompare(right.name, "ru"));
}
