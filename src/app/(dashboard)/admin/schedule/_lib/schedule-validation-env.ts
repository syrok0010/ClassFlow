export function getScheduleBreakValidationEnabled(): boolean {
  return process.env.SCHEDULE_ENABLE_BREAK_VALIDATION !== "false";
}
