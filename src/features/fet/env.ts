export const FET_DAY_START_MINUTES = Number(process.env.FET_DAY_START_MINUTES ?? 480);
export const FET_DAY_END_MINUTES = Number(process.env.FET_DAY_END_MINUTES ?? 1080);
export const FET_PERIOD_MINUTES = Number(process.env.FET_PERIOD_MINUTES ?? 5);
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
}
