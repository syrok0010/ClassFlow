import type { GroupType, SubjectType } from "@/generated/prisma/client";
import { requirementCellFormSchema, requirementMutationSchema } from "./schemas";
import { z } from "zod";

export type RequirementSubject = {
  id: string;
  name: string;
  type: SubjectType;
};

export type RequirementGroupNode = {
  id: string;
  name: string;
  type: Exclude<GroupType, "SUBJECT_SUBGROUP">;
  grade: number | null;
  parentId: string | null;
  subjectId: string | null;
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

export type SubjectColumnGroupKey = keyof typeof SubjectType;

export type RequirementMutationResult = {
  updated: RequirementEntry[];
  deletedGroupIds: string[];
};

export type RequirementMutationInput = z.infer<typeof requirementMutationSchema>;

export type RequirementCellFormInput = z.infer<typeof requirementCellFormSchema>;

export type NavigationDirection = "up" | "down" | "left" | "right" | "stay";
