import { FET_CORE_END_MINUTES, FET_DAY_END_MINUTES, FET_DAY_START_MINUTES, FET_PERIOD_MINUTES } from "./env";
import type { AttendanceLoadMode, SubjectType } from "@/generated/prisma/enums";
import type { FetDayOfWeek, FetInput, FetRequirement, FetTimeSlot } from "./types";

export function getCompatibleRoomIds(input: FetInput, subjectId: string): string[] {
  return input.roomSubjects
    .filter((roomSubject) => roomSubject.subjectId === subjectId)
    .map((roomSubject) => roomSubject.roomId)
    .sort();
}

export function getCompatibleRoomIdsForAudience(
  input: FetInput,
  subjectId: string,
  expectedAudienceSize: number,
): string[] {
  const roomsById = new Map(input.rooms.map((room) => [room.id, room]));

  return getCompatibleRoomIds(input, subjectId).filter((roomId) => {
    const seatsCount = roomsById.get(roomId)?.seatsCount;
    return seatsCount === undefined || seatsCount >= expectedAudienceSize;
  });
}

export function getExpectedAudienceSize(
  classSizes: number[],
  deliveryGroupSize: number,
  loadMode: AttendanceLoadMode,
): number {
  const fullClassSize = classSizes.reduce((sum, size) => sum + size, 0);

  if (loadMode === "FULL_CLASS_SIZE") {
    return fullClassSize;
  }

  if (loadMode === "AFTERSCHOOL_COEFFICIENT") {
    return Math.ceil(fullClassSize * 0.55);
  }

  return deliveryGroupSize;
}

export function getAllScheduleSlots(
  durationInMinutes: number,
  window: { startTime: number; endTime: number } = {
    startTime: FET_DAY_START_MINUTES,
    endTime: FET_DAY_END_MINUTES,
  },
): FetTimeSlot[] {
  const slots: FetTimeSlot[] = [];

  for (const dayOfWeek of [1, 2, 3, 4, 5] as FetDayOfWeek[]) {
    for (
      let startTime = window.startTime;
      startTime + durationInMinutes <= window.endTime;
      startTime += FET_PERIOD_MINUTES
    ) {
      slots.push({ dayOfWeek, startTime });
    }
  }

  return slots;
}

export function getOrdinarySubjectWindow(subjectType: SubjectType): { startTime: number; endTime: number } {
  if (subjectType === "ACADEMIC") {
    return {
      startTime: FET_DAY_START_MINUTES,
      endTime: FET_CORE_END_MINUTES,
    };
  }

  if (subjectType === "ELECTIVE_REQUIRED" || subjectType === "ELECTIVE_OPTIONAL") {
    return {
      startTime: FET_CORE_END_MINUTES,
      endTime: FET_DAY_END_MINUTES,
    };
  }

  return {
    startTime: FET_DAY_START_MINUTES,
    endTime: FET_DAY_END_MINUTES,
  };
}

export function getWindowSlots(
  windows: Array<{ dayOfWeek: FetDayOfWeek; startTime: number; endTime: number }>,
  durationInMinutes: number,
): FetTimeSlot[] {
  const slots: FetTimeSlot[] = [];

  for (const window of windows) {
    for (
      let startTime = window.startTime;
      startTime + durationInMinutes <= window.endTime;
      startTime += FET_PERIOD_MINUTES
    ) {
      slots.push({ dayOfWeek: window.dayOfWeek, startTime });
    }
  }

  return slots;
}

export function getRequirementLabel(requirement: FetRequirement): string {
  return `${requirement.group.name} / ${requirement.subject.name}`;
}
