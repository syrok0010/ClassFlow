import type { GroupType, SubjectType } from "@/generated/prisma/client";

export type RequirementSubject = {
  id: string;
  name: string;
  type: SubjectType;
};

export type RequirementGroupNode = {
  id: string;
  name: string;
  type: GroupType;
  grade: number | null;
  parentId: string | null;
  subjectId: string | null;
  subGroups: RequirementGroupNode[];
};

export type RequirementEntry = {
  groupId: string;
  subjectId: string;
  lessonsPerWeek: number;
  durationInMinutes: number;
  breakDuration: number;
};

export type RequirementsMatrixData = {
  groups: RequirementGroupNode[];
  subjects: RequirementSubject[];
  requirements: RequirementEntry[];
};

export type SubjectColumnGroupKey =
  | "REGIME"
  | "ACADEMIC"
  | "ELECTIVE_REQUIRED"
  | "ELECTIVE_OPTIONAL";

export type FlatRequirementRow = {
  id: string;
  name: string;
  type: GroupType;
  grade: number | null;
  parentId: string | null;
  subjectId: string | null;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
};

export type RequirementMutationInput = {
  groupId: string;
  subjectId: string;
  lessonsPerWeek: number;
  durationInMinutes: number;
  breakDuration: number;
};

export type RequirementMutationResult = {
  updated: RequirementEntry[];
  deletedGroupIds: string[];
};
