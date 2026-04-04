import type { SubjectType } from "@/generated/prisma/client";
import type { SegmentedControlOption } from "@/components/ui/segmented-control";
import type { SubjectFilterType, SubjectRenderInfo } from "@/lib/types";

export const SUBJECT_TYPE_OPTIONS: SubjectRenderInfo[] = [
  {
    value: "ACADEMIC",
    label: "Основной",
    labelPlural: "Основные",
    marker: "bg-blue-500/70",
    badge: "bg-blue-50 text-blue-700 ring-blue-600/20",
  },
  {
    value: "ELECTIVE_REQUIRED",
    label: "Доп. обязательный",
    labelPlural: "Доп. обязательные",
    marker: "bg-purple-500/70",
    badge: "bg-purple-50 text-purple-700 ring-purple-600/20",
  },
  {
    value: "ELECTIVE_OPTIONAL",
    label: "Доп. по выбору",
    labelPlural: "Доп. по выбору",
    marker: "bg-orange-500/70",
    badge: "bg-orange-50 text-orange-700 ring-orange-600/20",
  },
  {
    value: "REGIME",
    label: "Режимный",
    labelPlural: "Режимные",
    marker: "bg-emerald-500/70",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
];

export const SUBJECT_FILTERS: SegmentedControlOption<SubjectFilterType>[] = [
  { value: "ALL", label: "Все" },
  ...SUBJECT_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.labelPlural,
  })),
];

export const SUBJECT_LABELS: Record<SubjectType, string> = SUBJECT_TYPE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<SubjectType, string>
);

export const SUBJECT_LABELS_PLURAL: Record<SubjectType, string> = SUBJECT_TYPE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.labelPlural;
    return acc;
  },
  {} as Record<SubjectType, string>
);

export const SUBJECT_BADGES: Record<SubjectType, string> = SUBJECT_TYPE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.badge;
    return acc;
  },
  {} as Record<SubjectType, string>
);

export const SUBJECT_MARKERS: Record<SubjectType, string> = SUBJECT_TYPE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.marker;
    return acc;
  },
  {} as Record<SubjectType, string>
);

export const SUBJECT_SELECT: SubjectType[] = [...SUBJECT_TYPE_OPTIONS.map((option) => option.value)];
