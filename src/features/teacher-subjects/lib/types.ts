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

export type TeacherSubjectSummary = {
  total: number;
  academic: number;
  electiveRequired: number;
  electiveOptional: number;
  regime: number;
};

export type TeacherIdentity = {
  userId: string;
  teacherId: string;
  email: string | null;
  status: UserStatus;
  fullName: string;
  roleLabels: string[];
};

export type TeacherSubjectsPageData = {
  teacher: TeacherIdentity;
  teacherSubjects: TeacherSubjectRow[];
  subjectOptions: SubjectOption[];
};
