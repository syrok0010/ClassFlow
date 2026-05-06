import { getUserFullName } from "@/lib/auth-access";
import type { AvailabilityTeacher } from "./types";

type TeacherAvailabilityRecord = {
  id: string;
  user: {
    id: string;
    email: string | null;
    surname: string | null;
    name: string | null;
    patronymicName: string | null;
  };
  teacherAvailabilities: Array<{
    id: string;
    dayOfWeek: number;
    startTime: number;
    endTime: number;
    type: AvailabilityTeacher["templateEntries"][number]["type"];
  }>;
  teacherAvailabilityOverrides: Array<{
    id: string;
    startTime: Date;
    endTime: Date;
    type: AvailabilityTeacher["overrides"][number]["type"];
  }>;
};

export function mapTeacherToAvailabilityTeacher(
  teacher: TeacherAvailabilityRecord,
): AvailabilityTeacher {
  return {
    teacherId: teacher.id,
    userId: teacher.user.id,
    fullName: getUserFullName(teacher.user) || teacher.user.email || "Без имени",
    email: teacher.user.email,
    templateEntries: teacher.teacherAvailabilities.map((entry) => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      type: entry.type,
    })),
    overrides: teacher.teacherAvailabilityOverrides.map((entry) => ({
      id: entry.id,
      startTime: entry.startTime,
      endTime: entry.endTime,
      type: entry.type,
    })),
  };
}

export function mapTeachersToAvailabilityTeachers(
  teachers: TeacherAvailabilityRecord[],
): AvailabilityTeacher[] {
  return teachers.map(mapTeacherToAvailabilityTeacher);
}
