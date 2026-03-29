import type { SubjectType } from "@/generated/prisma/client";

export type SubjectFilterType = "all" | SubjectType;

export const SUBJECT_FILTER_OPTIONS = [
  { value: "all", label: "Все" },
  { value: "ACADEMIC", label: "Основные" },
  { value: "ELECTIVE_REQUIRED", label: "Доп. обязательные" },
  { value: "ELECTIVE_OPTIONAL", label: "Доп. по выбору" },
  { value: "REGIME", label: "Режимные" },
] as const;

export const SUBJECT_TYPE_SELECT_ITEMS: Record<SubjectType, string> = {
  ACADEMIC: "Основная программа",
  ELECTIVE_REQUIRED: "Доп. обязательный",
  ELECTIVE_OPTIONAL: "Доп. по выбору",
  REGIME: "Режимный момент",
};

export const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  ACADEMIC: "Основной",
  ELECTIVE_REQUIRED: "Доп. обязательный",
  ELECTIVE_OPTIONAL: "Доп. по выбору",
  REGIME: "Режимный",
};

export const SUBJECT_TYPE_SHORT_LABELS: Record<SubjectType, string> = {
  ACADEMIC: "Основной",
  ELECTIVE_REQUIRED: "Доп. обязательный",
  ELECTIVE_OPTIONAL: "Доп. по выбору",
  REGIME: "Режимный",
};

export const SUBJECT_TYPE_BADGE_CLASS: Record<SubjectType, string> = {
  ACADEMIC: "bg-blue-50 text-blue-700 ring-blue-600/20",
  ELECTIVE_REQUIRED: "bg-purple-50 text-purple-700 ring-purple-600/20",
  ELECTIVE_OPTIONAL: "bg-orange-50 text-orange-700 ring-orange-600/20",
  REGIME: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export const SUBJECT_TYPE_SECTION_MARKER_CLASS: Record<SubjectType, string> = {
  ACADEMIC: "bg-blue-500/70",
  ELECTIVE_REQUIRED: "bg-purple-500/70",
  ELECTIVE_OPTIONAL: "bg-orange-500/70",
  REGIME: "bg-emerald-500/70",
};

export const SUBJECT_TYPE_ORDER: SubjectType[] = [
  "ACADEMIC",
  "ELECTIVE_REQUIRED",
  "ELECTIVE_OPTIONAL",
  "REGIME",
];

export const TYPE_OPTIONS: { value: SubjectType; label: string }[] = [
  { value: "ACADEMIC", label: "Основная программа" },
  { value: "ELECTIVE_REQUIRED", label: "Доп. обязательный" },
  { value: "ELECTIVE_OPTIONAL", label: "Доп. по выбору" },
  { value: "REGIME", label: "Режимный момент" },
];