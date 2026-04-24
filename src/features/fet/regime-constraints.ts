import type { FetDayOfWeek } from "./types";

export type RegimeConstraintRule = {
  subjectName: string;
  allowedWindowsByDay: Array<{
    dayOfWeek: FetDayOfWeek;
    startTime: number;
    endTime: number;
  }>;
  maxPerDay: 1;
  minDaysBetweenActivities?: number;
  requiredRoomSubjectCompatibility: boolean;
};

const SCHOOL_DAYS: FetDayOfWeek[] = [1, 2, 3, 4, 5];

function everySchoolDay(startTime: number, endTime: number) {
  return SCHOOL_DAYS.map((dayOfWeek) => ({ dayOfWeek, startTime, endTime }));
}

export const REGIME_CONSTRAINT_RULES: RegimeConstraintRule[] = [
  {
    subjectName: "Завтрак",
    allowedWindowsByDay: everySchoolDay(8 * 60 + 30, 10 * 60 + 30),
    maxPerDay: 1,
    requiredRoomSubjectCompatibility: true,
  },
  {
    subjectName: "Обед",
    allowedWindowsByDay: everySchoolDay(12 * 60, 14 * 60 + 30),
    maxPerDay: 1,
    requiredRoomSubjectCompatibility: true,
  },
  {
    subjectName: "Полдник",
    allowedWindowsByDay: everySchoolDay(14 * 60 + 30, 16 * 60 + 30),
    maxPerDay: 1,
    requiredRoomSubjectCompatibility: true,
  },
  {
    subjectName: "Прогулка",
    allowedWindowsByDay: everySchoolDay(10 * 60, 18 * 60),
    maxPerDay: 1,
    requiredRoomSubjectCompatibility: true,
  },
  {
    subjectName: "Сон",
    allowedWindowsByDay: everySchoolDay(12 * 60, 16 * 60),
    maxPerDay: 1,
    requiredRoomSubjectCompatibility: true,
  },
];

export function getRegimeConstraintRule(subjectName: string): RegimeConstraintRule | null {
  return REGIME_CONSTRAINT_RULES.find((rule) => rule.subjectName === subjectName) ?? null;
}
