"use client";

import { Badge } from "@/components/ui/badge";
import type { AvailabilityTeacher } from "@/features/availability/lib/types";
import {
  buildSlotLabels,
  getTemplateCoverageCount,
  hasWeekOverride,
} from "@/features/availability/lib/utils";

export const SLOT_LABELS = buildSlotLabels();

function getTeacherTemplateBadge(teacher: AvailabilityTeacher) {
  const coverage = getTemplateCoverageCount(teacher);

  if (coverage === 0) {
    return <Badge variant="outline">Нет шаблона</Badge>;
  }

  return <Badge variant="secondary">{coverage} интервалов</Badge>;
}

export function getTeacherStatusBadges(teacher: AvailabilityTeacher, weekStart: Date) {
  const badges = [getTeacherTemplateBadge(teacher)];

  if (hasWeekOverride(teacher, weekStart)) {
    badges.push(
      <Badge key="override" variant="destructive">
        Есть исключение
      </Badge>,
    );
  }

  return badges;
}

export function filterTeachers(
  teachers: AvailabilityTeacher[],
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return teachers.filter((teacher) => {
    if (normalizedQuery) {
      const haystack = `${teacher.fullName} ${teacher.email ?? ""}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });
}
