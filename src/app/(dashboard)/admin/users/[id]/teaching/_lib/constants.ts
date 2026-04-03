import type { SubjectType } from "@/generated/prisma/enums";
import type {
  SubjectRenderInfo,
  TeacherSubjectFilterType,
  TeacherSubjectTypeGroup,
} from "./types";

export const TYPE_OPTIONS: SubjectRenderInfo[] = [
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
    marker: "bg-amber-500/70",
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
  {
    value: "ELECTIVE_OPTIONAL",
    label: "Доп. по выбору",
    labelPlural: "Доп. по выбору",
    marker: "bg-amber-500/70",
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
  {
    value: "REGIME",
    label: "Режимный",
    labelPlural: "Режимные",
    marker: "bg-emerald-500/70",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
];

export const SUBJECT_LABELS: Record<SubjectType, string> = TYPE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<SubjectType, string>
);

export const SUBJECT_BADGES: Record<SubjectType, string> = TYPE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.badge;
    return acc;
  },
  {} as Record<SubjectType, string>
);

export const SUBJECT_MARKERS: Record<SubjectType, string> = TYPE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.marker;
    return acc;
  },
  {} as Record<SubjectType, string>
);

export const TEACHING_FILTERS: {
  value: TeacherSubjectFilterType;
  label: string;
}[] = [
  { value: "ALL", label: "Все" },
  { value: "ACADEMIC", label: "Academic" },
  { value: "ELECTIVE", label: "Elective" },
  { value: "REGIME", label: "Regime" },
];

export const SUBJECT_TYPE_TO_GROUP: Record<SubjectType, TeacherSubjectTypeGroup> = {
  ACADEMIC: "ACADEMIC",
  ELECTIVE_REQUIRED: "ELECTIVE",
  ELECTIVE_OPTIONAL: "ELECTIVE",
  REGIME: "REGIME",
};
