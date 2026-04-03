import type { SubjectType } from "@/generated/prisma/client";
import type { UserStatus } from "@/generated/prisma/enums";

export type TeacherSubjectRow = {
  teacherId: string;
  subjectId: string;
  subjectName: string;
  subjectType: SubjectType;
  minGrade: number | null;
  maxGrade: number | null;
};

export type SubjectOption = {
  id: string;
  name: string;
  type: SubjectType;
};

export type TeacherSubjectsFilters = {
  search?: string;
  type?: SubjectType;
};

export type TeacherSubjectTypeGroup = "ACADEMIC" | "ELECTIVE" | "REGIME";

export type TeacherSubjectFilterType = "ALL" | TeacherSubjectTypeGroup;

export type TeacherSubjectSummary = {
  total: number;
  academic: number;
  elective: number;
  regime: number;
  minCoveredGrade: number | null;
  maxCoveredGrade: number | null;
};

export type TeacherIdentity = {
  userId: string;
  teacherId: string;
  email: string | null;
  status: UserStatus;
  fullName: string;
  roleLabels: string[];
};

export type TeachingPageData = {
  teacher: TeacherIdentity;
  teacherSubjects: TeacherSubjectRow[];
  subjectOptions: SubjectOption[];
};

export type SubjectRenderInfo = {
  value: SubjectType;
  label: string;
  labelPlural: string;
  marker: string;
  badge: string;
};
