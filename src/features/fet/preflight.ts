import { FET_PERIOD_MINUTES } from "./env";
import { getRegimeConstraintRule } from "./regime-constraints";
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
}
