import type { GroupType } from "@/generated/prisma/enums";

type RequirementDurationRecord = {
  groupId: string;
  subjectId: string;
  durationInMinutes: number;
};

type TemplateDurationRecord = {
  subjectId: string;
  deliveryGroupId: string | null;
  startTime: number | null;
  endTime: number | null;
  deliveryGroup?: {
    type: GroupType;
    parentId?: string | null;
    parentGroup?: { id: string } | null;
  } | null;
  coveredClasses: { classGroupId: string }[];
};

export function buildLessonDurationByGroupSubject(
  requirements: RequirementDurationRecord[],
  templates: TemplateDurationRecord[],
) {
  const durationByGroupSubject: Record<string, number> = {};

  for (const requirement of requirements) {
    durationByGroupSubject[`${requirement.groupId}:${requirement.subjectId}`] = requirement.durationInMinutes;
  }

  const fallbackDurations = new Map<string, Set<number>>();

  for (const template of templates) {
    if (template.startTime === null || template.endTime === null) {
      continue;
    }

    const duration = template.endTime - template.startTime;
    const groupIds = getTemplateRequirementGroupIds(template);

    for (const groupId of groupIds) {
      const key = `${groupId}:${template.subjectId}`;
      if (durationByGroupSubject[key] !== undefined) {
        continue;
      }

      const durations = fallbackDurations.get(key) ?? new Set<number>();
      durations.add(duration);
      fallbackDurations.set(key, durations);
    }
  }

  for (const [key, durations] of fallbackDurations) {
    if (durations.size === 1) {
      durationByGroupSubject[key] = [...durations][0];
    }
  }

  return durationByGroupSubject;
}

function getTemplateRequirementGroupIds(template: TemplateDurationRecord) {
  if (template.coveredClasses.length > 0) {
    return template.coveredClasses.map((coveredClass) => coveredClass.classGroupId);
  }

  if (!template.deliveryGroupId) {
    return [];
  }

  if (template.deliveryGroup?.type === "SUBJECT_SUBGROUP") {
    return Array.from(new Set([
      template.deliveryGroupId,
      template.deliveryGroup.parentId ?? template.deliveryGroup.parentGroup?.id ?? null,
    ].filter((groupId): groupId is string => Boolean(groupId))));
  }

  return [template.deliveryGroupId];
}
