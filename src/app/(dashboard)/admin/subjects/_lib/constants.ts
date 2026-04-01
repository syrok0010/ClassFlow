import {SubjectFilterType, SubjectRenderInfo} from "@/app/(dashboard)/admin/subjects/_lib/types";
import {SubjectType} from "@/generated/prisma/enums";

export const TYPE_OPTIONS: SubjectRenderInfo[] = [
  {
    value: "ACADEMIC",
    label: "Основной",
    label_plural: "Основные",
    marker: "bg-blue-500/70",
    badge: "bg-blue-50 text-blue-700 ring-blue-600/20"
  },
  {
    value: "ELECTIVE_REQUIRED",
    label: "Доп. обязательный",
    label_plural: "Доп. обязательные",
    marker: "bg-purple-500/70",
    badge: "bg-purple-50 text-purple-700 ring-purple-600/20"
  },
  {
    value: "ELECTIVE_OPTIONAL",
    label: "Доп. по выбору",
    label_plural: "Доп. по выбору",
    marker: "bg-orange-500/70",
    badge: "bg-orange-50 text-orange-700 ring-orange-600/20"
  },
  {
    value: "REGIME",
    label: "Режимный",
    label_plural: "Режимные",
    marker: "bg-emerald-500/70",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
  }
] as const;

export const SUBJECT_FILTERS: {
  value: SubjectFilterType;
  label: string;
}[] = [
  { value: "ALL", label: "Все" },
  ...TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label_plural,
  })),
]

export const SUBJECT_LABELS: Record<SubjectType, string> = TYPE_OPTIONS
    .reduce((acc, option) => {
      acc[option.value] = option.label;
      return acc
    }, {} as Record<SubjectType, string>);

export const SUBJECT_BADGES: Record<SubjectType, string> = TYPE_OPTIONS
    .reduce((acc, option) => {
      acc[option.value] = option.badge;
      return acc
    }, {} as Record<SubjectType, string>);

export const SUBJECT_MARKERS: Record<SubjectType, string> = TYPE_OPTIONS
    .reduce((acc, option) => {
      acc[option.value] = option.marker;
      return acc
    }, {} as Record<SubjectType, string>);

export const SUBJECT_SELECT: SubjectType[] = [
  ...TYPE_OPTIONS.map((option) => (option.value))
]