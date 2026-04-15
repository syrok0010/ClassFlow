"use client";

import { Badge } from "@/components/ui/badge";
import type { AvailabilityTeacher } from "../_lib/types";
import {
  buildSlotLabels,
  getTemplateCoverageCount,
  hasWeekOverride,
} from "../_lib/utils";

export type PanelMode = "view" | "edit";

export const MODE_OPTIONS = [
  { value: "view", label: "Просмотр" },
  { value: "edit", label: "Редактирование" },
] as const;

export const SLOT_LABELS = buildSlotLabels();

function getTeacherTemplateBadge(teacher: AvailabilityTeacher) {
  const coverage = getTemplateCoverageCount(teacher);

  if (coverage === 0) {
    return <Badge variant="outline">Нет шаблона</Badge>;
  }

  return <Badge variant="secondary">{coverage} интервалов</Badge>;
}

export function getTeacherStatusBadges(teacher: AvailabilityTeacher, weekStart: string) {
  const badges = [getTeacherTemplateBadge(teacher)];

  if (hasWeekOverride(teacher, weekStart)) {
    badges.push(
      <Badge key="override" variant="destructive">
        Есть исключение
      </Badge>,
    );
  }

  if (teacher.scheduleEntries.length > 0) {
    badges.push(
      <Badge key="lessons" variant="outline">
        {teacher.scheduleEntries.length} уроков
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
