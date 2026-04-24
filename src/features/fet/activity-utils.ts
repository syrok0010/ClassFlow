import { FET_DAY_END_MINUTES, FET_DAY_START_MINUTES, FET_PERIOD_MINUTES } from "./env";
import type { FetDayOfWeek, FetInput, FetRequirement, FetTimeSlot } from "./types";

export function getCompatibleRoomIds(input: FetInput, subjectId: string): string[] {
  return input.roomSubjects
    .filter((roomSubject) => roomSubject.subjectId === subjectId)
    .map((roomSubject) => roomSubject.roomId)
    .sort();
}

export function getAllScheduleSlots(durationInMinutes: number): FetTimeSlot[] {
  const slots: FetTimeSlot[] = [];

  for (const dayOfWeek of [1, 2, 3, 4, 5] as FetDayOfWeek[]) {
    for (
      let startTime = FET_DAY_START_MINUTES;
      startTime + durationInMinutes <= FET_DAY_END_MINUTES;
      startTime += FET_PERIOD_MINUTES
    ) {
      slots.push({ dayOfWeek, startTime });
    }
  }

  return slots;
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
