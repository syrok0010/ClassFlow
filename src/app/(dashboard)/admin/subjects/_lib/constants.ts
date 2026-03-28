import type { SubjectType } from "@/generated/prisma/client";

export type SubjectFilterType = "all" | SubjectType;
export type SubjectSortKey = "name" | "type";

export const SUBJECT_FILTER_OPTIONS = [
  { value: "all", label: "Все" },
  { value: "ACADEMIC", label: "Основные" },
  { value: "ELECTIVE", label: "Дополнительные" },
  { value: "REGIME", label: "Режимные" },
] as const;

export const SUBJECT_SORT_OPTIONS = [
  { value: "name", label: "По названию" },
  { value: "type", label: "По типу" },
] as const;

export const SUBJECT_TYPE_SELECT_ITEMS: Record<SubjectType, string> = {
  ACADEMIC: "Основная программа",
  ELECTIVE: "Дополнительные занятия",
  REGIME: "Режимные моменты",
};

export const SUBJECT_SORT_SELECT_ITEMS: Record<SubjectSortKey, string> = {
  name: "По названию",
  type: "По типу",
};

export const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  ACADEMIC: "Основной",
  ELECTIVE: "Дополнительный",
  REGIME: "Режимный",
};

export const SUBJECT_TYPE_SHORT_LABELS: Record<SubjectType, string> = {
  ACADEMIC: "Основной",
  ELECTIVE: "Дополнительный",
  REGIME: "Режимный",
};

export const SUBJECT_TYPE_BADGE_CLASS: Record<SubjectType, string> = {
  ACADEMIC: "bg-blue-50 text-blue-700 ring-blue-600/20",
  ELECTIVE: "bg-orange-50 text-orange-700 ring-orange-600/20",
  REGIME: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export const SUBJECT_TYPE_SECTION_MARKER_CLASS: Record<SubjectType, string> = {
  ACADEMIC: "bg-blue-500/70",
  ELECTIVE: "bg-orange-500/70",
  REGIME: "bg-emerald-500/70",
};

export const SUBJECT_TYPE_ORDER: SubjectType[] = ["ACADEMIC", "ELECTIVE", "REGIME"];
