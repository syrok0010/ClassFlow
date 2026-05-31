import {
  getCompatibleRoomIdsForAudience,
  getExpectedAudienceSize,
  getWindowSlots,
} from "./activity-utils";
import { getRegimeConstraintRule } from "./regime-constraints";
import type { FetActivity, FetInput, FetRequirement } from "./types";

const MAX_SHARED_REGIME_GRADE_DELTA = 2;

type RegimeBucket = {
  requirements: FetRequirement[];
  minGrade: number | null;
  maxGrade: number | null;
};

function getRequirementGrade(requirement: FetRequirement): number | null {
  return requirement.group.grade;
}

function getRequirementStudentCount(requirement: FetRequirement): number {
  return requirement.group.studentCount ?? 0;
}

function canShareRegimeBucket(bucket: RegimeBucket, requirement: FetRequirement): boolean {
  const grade = getRequirementGrade(requirement);

  if (grade === null || bucket.minGrade === null || bucket.maxGrade === null) {
    return bucket.requirements.length === 0;
  }

  return Math.max(bucket.maxGrade, grade) - Math.min(bucket.minGrade, grade) <= MAX_SHARED_REGIME_GRADE_DELTA;
}

function addRequirementToBucket(bucket: RegimeBucket, requirement: FetRequirement): RegimeBucket {
  const grade = getRequirementGrade(requirement);

  return {
    requirements: [...bucket.requirements, requirement],
    minGrade: grade === null
      ? bucket.minGrade
      : bucket.minGrade === null ? grade : Math.min(bucket.minGrade, grade),
    maxGrade: grade === null
      ? bucket.maxGrade
      : bucket.maxGrade === null ? grade : Math.max(bucket.maxGrade, grade),
  };
}

function getRegimeBucketAudienceSize(bucket: RegimeBucket): number {
  const subject = bucket.requirements[0]?.subject;
  const loadMode = subject?.defaultAttendanceLoadMode ?? "DELIVERY_GROUP_SIZE";
  const classSizes = bucket.requirements.map(getRequirementStudentCount);

  return getExpectedAudienceSize(
    classSizes,
    classSizes.reduce((sum, size) => sum + size, 0),
    loadMode,
  );
}

function getRegimeBucketRoomIds(input: FetInput, bucket: RegimeBucket): string[] {
  const subjectId = bucket.requirements[0]?.subjectId;
  if (!subjectId) return [];

  return getCompatibleRoomIdsForAudience(input, subjectId, getRegimeBucketAudienceSize(bucket));
}

function buildRegimeBuckets(input: FetInput, requirements: FetRequirement[]): RegimeBucket[] {
  const buckets: RegimeBucket[] = [];
  const sortedRequirements = [...requirements].sort((left, right) =>
    (left.group.grade ?? 0) - (right.group.grade ?? 0) ||
    left.group.name.localeCompare(right.group.name, "ru"),
  );

  for (const requirement of sortedRequirements) {
    let placed = false;

    for (let index = 0; index < buckets.length; index += 1) {
      const nextBucket = addRequirementToBucket(buckets[index], requirement);

      if (canShareRegimeBucket(buckets[index], requirement) && getRegimeBucketRoomIds(input, nextBucket).length > 0) {
        buckets[index] = nextBucket;
        placed = true;
        break;
      }
    }

    if (!placed) {
      buckets.push(addRequirementToBucket({ requirements: [], minGrade: null, maxGrade: null }, requirement));
    }
  }

  return buckets;
}

function groupByDuration(requirements: FetRequirement[]): FetRequirement[][] {
  const groups = new Map<number, FetRequirement[]>();

  for (const requirement of requirements) {
    const current = groups.get(requirement.durationInMinutes) ?? [];
    current.push(requirement);
    groups.set(requirement.durationInMinutes, current);
  }

  return Array.from(groups.values());
}

export function buildRegimeActivities(input: FetInput, firstActivityId = 1): FetActivity[] {
  const activities: FetActivity[] = [];
  let nextId = firstActivityId;

  const requirementsBySubjectId = new Map<string, FetRequirement[]>();
  for (const requirement of input.regimeRequirements) {
    const current = requirementsBySubjectId.get(requirement.subjectId) ?? [];
    current.push(requirement);
    requirementsBySubjectId.set(requirement.subjectId, current);
  }

  for (const requirements of requirementsBySubjectId.values()) {
    const representativeRequirement = requirements[0];
    const rule = getRegimeConstraintRule(representativeRequirement.subject.name);
    if (!rule) {
      throw new Error(`Для режимного предмета "${representativeRequirement.subject.name}" не задано временное окно генерации`);
    }

    const windowsByDay = [...rule.allowedWindowsByDay].sort((left, right) => left.dayOfWeek - right.dayOfWeek);

    for (let windowIndex = 0; windowIndex < windowsByDay.length; windowIndex += 1) {
      const window = windowsByDay[windowIndex];
      const requirementsForDay = requirements.filter((requirement) => windowIndex < requirement.lessonsPerWeek);

      for (const sameDurationRequirements of groupByDuration(requirementsForDay)) {
        for (const bucket of buildRegimeBuckets(input, sameDurationRequirements)) {
          const primaryRequirement = bucket.requirements[0];
          const coveredClassIds = bucket.requirements.map((requirement) => requirement.groupId).sort();
          const roomIds = getRegimeBucketRoomIds(input, bucket);

          if (roomIds.length === 0) {
            throw new Error(
              `Для режимного предмета "${primaryRequirement.subject.name}" нет кабинета нужной вместимости для ${coveredClassIds.length} классов`,
            );
          }

          activities.push({
            id: nextId,
            source: "REGIME",
            groupId: primaryRequirement.groupId,
            studentSetIds: coveredClassIds,
            subjectId: primaryRequirement.subjectId,
            teacherId: null,
            durationInMinutes: primaryRequirement.durationInMinutes,
            allowedSlots: getWindowSlots([window], primaryRequirement.durationInMinutes),
            roomIds,
            deliveryMode: coveredClassIds.length > 1 ? "SHARED_CLASSES" : "DIRECT_GROUP",
            deliveryGroupId: coveredClassIds.length > 1 ? null : primaryRequirement.groupId,
            coveredClassIds: coveredClassIds.length > 1 ? coveredClassIds : [],
            openClassIds: [],
            attendanceLoadModeOverride: null,
            expectedAudienceSize: getRegimeBucketAudienceSize(bucket),
          });
          nextId += 1;
        }
      }
    }
  }

  return activities;
}
