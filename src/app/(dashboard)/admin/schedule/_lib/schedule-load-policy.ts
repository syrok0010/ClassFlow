import type { AttendanceLoadMode } from "@/generated/prisma/enums";

import { AFTERSCHOOL_ATTENDANCE_COEFFICIENT } from "./schedule-domain-constants";

export type ScheduleAudienceLoad = {
  deliveryGroupSize: number;
  fullClassSize: number;
};

export function getExpectedScheduleAudienceSize(
  audience: ScheduleAudienceLoad,
  loadMode: AttendanceLoadMode,
) {
  if (loadMode === "FULL_CLASS_SIZE") {
    return audience.fullClassSize;
  }

  if (loadMode === "AFTERSCHOOL_COEFFICIENT") {
    return Math.ceil(audience.fullClassSize * AFTERSCHOOL_ATTENDANCE_COEFFICIENT);
  }

  return audience.deliveryGroupSize;
}
