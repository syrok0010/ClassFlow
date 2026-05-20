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
    const groupIds = template.coveredClasses.length > 0
      ? template.coveredClasses.map((coveredClass) => coveredClass.classGroupId)
      : template.deliveryGroupId
        ? [template.deliveryGroupId]
        : [];

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
