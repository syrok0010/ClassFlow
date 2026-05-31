import {
  FET_DAY_END_MINUTES,
  FET_DAY_START_MINUTES,
  FET_PERIOD_MINUTES,
} from "./env";
import { getRegimeConstraintRule } from "./regime-constraints";
import { assignTeachers } from "./teacher-assignment";
import type { FetInput, FetRequirement, FetTeacherSubject } from "./types";

function getCompatibleRoomIds(input: FetInput, subjectId: string): string[] {
  return input.roomSubjects
    .filter((roomSubject) => roomSubject.subjectId === subjectId)
    .map((roomSubject) => roomSubject.roomId);
}

function getTeacherCandidates(input: FetInput, requirement: FetRequirement): FetTeacherSubject[] {
  return input.teacherSubjects.filter((teacherSubject) => {
    if (teacherSubject.subjectId !== requirement.subjectId) return false;

    const grade = requirement.group.grade;
    if (grade === null) return true;
    if (teacherSubject.minGrade !== null && grade < teacherSubject.minGrade) return false;
    if (teacherSubject.maxGrade !== null && grade > teacherSubject.maxGrade) return false;

    return true;
  });
}

function normalizeAvailabilityTime(value: number | Date) {
  if (typeof value === "number") return value;
  return value.getHours() * 60 + value.getMinutes();
}

function getTeacherFreeSlotCount(input: FetInput, teacherId: string): number {
  const availabilities = input.teacherAvailabilities.filter((availability) =>
    availability.teacherId === teacherId && availability.dayOfWeek >= 1 && availability.dayOfWeek <= 5,
  );
  const allowed = availabilities.filter((availability) =>
    availability.type === "AVAILABLE" || availability.type === "PREFERRED",
  );
  const unavailable = availabilities.filter((availability) => availability.type === "UNAVAILABLE");
  let freeSlotCount = 0;

  for (const dayOfWeek of [1, 2, 3, 4, 5]) {
    for (let startTime = FET_DAY_START_MINUTES; startTime < FET_DAY_END_MINUTES; startTime += FET_PERIOD_MINUTES) {
      const insideAllowed = allowed.some((availability) =>
        availability.dayOfWeek === dayOfWeek &&
        normalizeAvailabilityTime(availability.startTime) <= startTime &&
        startTime < normalizeAvailabilityTime(availability.endTime),
      );
      const insideUnavailable = unavailable.some((availability) =>
        availability.dayOfWeek === dayOfWeek &&
        normalizeAvailabilityTime(availability.startTime) <= startTime &&
        startTime < normalizeAvailabilityTime(availability.endTime),
      );

      if (insideAllowed && !insideUnavailable) {
        freeSlotCount += 1;
      }
    }
  }

  return freeSlotCount;
}

function assertAssignedTeachersHaveAvailability(input: FetInput): void {
  const teacherAssignments = assignTeachers(input);
  const requiredPeriodsByTeacherId = new Map<string, number>();

  for (const requirement of input.lessonRequirements) {
    if (requirement.lessonsPerWeek === 0) continue;

    const teacherId = teacherAssignments.get(`${requirement.groupId}:${requirement.subjectId}`);
    if (!teacherId) continue;

    const current = requiredPeriodsByTeacherId.get(teacherId) ?? 0;
    requiredPeriodsByTeacherId.set(
      teacherId,
      current + requirement.lessonsPerWeek * (requirement.durationInMinutes / FET_PERIOD_MINUTES),
    );
  }

  const blockedTeachers = Array.from(requiredPeriodsByTeacherId.entries())
    .map(([teacherId, requiredPeriods]) => ({
      teacherId,
      requiredPeriods,
      freeSlotCount: getTeacherFreeSlotCount(input, teacherId),
    }))
    .filter((item) => item.freeSlotCount === 0 || item.freeSlotCount < item.requiredPeriods);

  if (blockedTeachers.length === 0) {
    return;
  }

  const preview = blockedTeachers
    .slice(0, 8)
    .map((item) => {
      const teacherName = input.teacherNamesById?.[item.teacherId] ?? item.teacherId;
      return `${teacherName}: нужно ${item.requiredPeriods}, доступно ${item.freeSlotCount}`;
    })
    .join("; ");
  const tail = blockedTeachers.length > 8 ? `; еще ${blockedTeachers.length - 8}` : "";

  throw new Error(
    `Недостаточно доступности преподавателей для FET. Отсутствие записи доступности считается недоступностью. ${preview}${tail}`,
  );
}

export function preflightFetInput(input: FetInput): void {
  for (const requirement of input.requirements) {
    if (requirement.durationInMinutes <= 0) {
      throw new Error(
        `Для "${requirement.group.name} / ${requirement.subject.name}" указана неположительная длительность`,
      );
    }

    if (requirement.durationInMinutes % FET_PERIOD_MINUTES !== 0) {
      throw new Error(
        `Длительность "${requirement.group.name} / ${requirement.subject.name}" должна быть кратна ${FET_PERIOD_MINUTES} минутам`,
      );
    }

    if (requirement.breakDuration % FET_PERIOD_MINUTES !== 0) {
      throw new Error(
        `Длительность перемены "${requirement.group.name} / ${requirement.subject.name}" должна быть кратна ${FET_PERIOD_MINUTES} минутам`,
      );
    }

    if (requirement.lessonsPerWeek < 0) {
      throw new Error(
        `Количество занятий "${requirement.group.name} / ${requirement.subject.name}" не может быть отрицательным`,
      );
    }
  }

  for (const requirement of input.regimeRequirements) {
    const rule = getRegimeConstraintRule(requirement.subject.name);

    if (!rule) {
      throw new Error(`Для режимного предмета "${requirement.subject.name}" не задано временное окно генерации`);
    }

    const configuredDays = new Set(rule.allowedWindowsByDay.map((window) => window.dayOfWeek));
    if (requirement.lessonsPerWeek > configuredDays.size) {
      throw new Error(
        `Для "${requirement.group.name} / ${requirement.subject.name}" задано ${requirement.lessonsPerWeek} занятий, но при maxPerDay=1 доступно только ${configuredDays.size} дней`,
      );
    }

    if (rule.requiredRoomSubjectCompatibility && getCompatibleRoomIds(input, requirement.subjectId).length === 0) {
      throw new Error(
        `Для режимного предмета "${requirement.subject.name}" нет совместимых кабинетов в RoomSubject`,
      );
    }
  }

  for (const requirement of input.lessonRequirements) {
    if (requirement.lessonsPerWeek === 0) continue;

    const candidates = getTeacherCandidates(input, requirement);
    if (candidates.length === 0) {
      throw new Error(
        `Для "${requirement.group.name} / ${requirement.subject.name}" не найден подходящий преподаватель`,
      );
    }
  }

  assertAssignedTeachersHaveAvailability(input);
}
