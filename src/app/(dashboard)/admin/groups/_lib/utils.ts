import type { StudentForAssignment } from "./types";

export type StudentBucketMap = Record<string, string[]>;

export function getStudentDisplayName(student: StudentForAssignment): string {
  const parts = [
    student.user.surname,
    student.user.name,
    student.user.patronymicName,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : "Без имени";
}

export function distributeStudentIdsEvenly(
  studentIds: string[],
  bucketIds: string[]
): StudentBucketMap {
  const buckets = Object.fromEntries(
    bucketIds.map((bucketId) => [bucketId, [] as string[]])
  );

  if (bucketIds.length === 0) {
    return buckets;
  }

  const shuffledStudentIds = [...studentIds].sort(() => Math.random() - 0.5);

  for (const [index, studentId] of shuffledStudentIds.entries()) {
    const bucketId = bucketIds[index % bucketIds.length];
    buckets[bucketId].push(studentId);
  }

  return buckets;
}
