import type { SubjectColumnGroupKey } from "./types";

export const SUBJECT_COLUMN_GROUPS: Array<{
  key: SubjectColumnGroupKey;
  label: string;
  stubLabel: string;
}> = [
  {
    key: "REGIME",
    label: "Режимные предметы",
    stubLabel: "Режимные",
  },
  {
    key: "ACADEMIC",
    label: "Основные предметы",
    stubLabel: "Основные",
  },
  {
    key: "ELECTIVE_REQUIRED",
    label: "Общие допы",
    stubLabel: "Общие допы",
  },
  {
    key: "ELECTIVE_OPTIONAL",
    label: "Допы по выбору",
    stubLabel: "По выбору",
  },
];

export const QUICK_INPUT_DEFAULT_DURATION = 45;
export const QUICK_INPUT_DEFAULT_BREAK = 10;

export function getSubjectColumnId(subjectId: string): string {
  return `subject::${subjectId}`;
}

export function getCollapsedGroupColumnId(key: SubjectColumnGroupKey): string {
  return `collapsed::${key}`;
}
