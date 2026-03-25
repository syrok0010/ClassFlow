import type { StudentForAssignment } from "./types";

export function getStudentDisplayName(student: StudentForAssignment): string {
  const parts = [
    student.user.surname,
    student.user.name,
    student.user.patronymicName,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : "Без имени";
}
