export const FET_DAY_START_MINUTES = Number(process.env.FET_DAY_START_MINUTES ?? 480);
export const FET_DAY_END_MINUTES = Number(process.env.FET_DAY_END_MINUTES ?? 1080);
export const FET_PERIOD_MINUTES = Number(process.env.FET_PERIOD_MINUTES ?? 5);
export const FET_CORE_END_MINUTES = Number(process.env.FET_CORE_END_MINUTES ?? 14 * 60);
export const FET_CORE_WINDOW_WEIGHT = Number(process.env.FET_CORE_WINDOW_WEIGHT ?? 95);
export const FET_ENABLE_STUDENT_GAP_CONSTRAINTS =
  process.env.FET_ENABLE_STUDENT_GAP_CONSTRAINTS === "true";
export const FET_STUDENTS_MAX_GAPS_PER_WEEK = Number(process.env.FET_STUDENTS_MAX_GAPS_PER_WEEK ?? 0);
export const FET_STUDENTS_MAX_GAPS_WEIGHT = Number(process.env.FET_STUDENTS_MAX_GAPS_WEIGHT ?? 100);
export const FET_CLI_PATH = process.env.FET_CLI_PATH ?? "fet-cl";
export const FET_WORK_DIR = process.env.FET_WORK_DIR ?? ".classflow/fet-runs";
export const FET_TIMEOUT_MS = Number(process.env.FET_TIMEOUT_MS ?? 120000);

export const FET_DAYS = [
  { dayOfWeek: 1 as const, name: "Monday" },
  { dayOfWeek: 2 as const, name: "Tuesday" },
  { dayOfWeek: 3 as const, name: "Wednesday" },
  { dayOfWeek: 4 as const, name: "Thursday" },
  { dayOfWeek: 5 as const, name: "Friday" },
];

export function assertFetEnvironment(): void {
  if (!Number.isInteger(FET_PERIOD_MINUTES) || FET_PERIOD_MINUTES <= 0) {
    throw new Error("FET_PERIOD_MINUTES должен быть положительным целым числом");
  }

  if (FET_DAY_START_MINUTES >= FET_DAY_END_MINUTES) {
    throw new Error("FET_DAY_START_MINUTES должен быть меньше FET_DAY_END_MINUTES");
  }

  if (FET_CORE_END_MINUTES <= FET_DAY_START_MINUTES || FET_CORE_END_MINUTES >= FET_DAY_END_MINUTES) {
    throw new Error("FET_CORE_END_MINUTES должен быть внутри учебного дня");
  }

  if (FET_STUDENTS_MAX_GAPS_WEIGHT < 0 || FET_STUDENTS_MAX_GAPS_WEIGHT > 100) {
    throw new Error("FET_STUDENTS_MAX_GAPS_WEIGHT должен быть от 0 до 100");
  }

  if (FET_CORE_WINDOW_WEIGHT < 0 || FET_CORE_WINDOW_WEIGHT > 100) {
    throw new Error("FET_CORE_WINDOW_WEIGHT должен быть от 0 до 100");
  }
}
