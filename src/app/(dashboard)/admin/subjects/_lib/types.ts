import type { SubjectType } from "@/generated/prisma/client";

export type SubjectUsage = {
  roomsCount: number;
  requirementsCount: number;
  teachersCount: number;
  scheduleTemplatesCount: number;
  scheduleEntriesCount: number;
};

export type SubjectWithUsage = {
  id: string;
  name: string;
  type: SubjectType;
  usage: SubjectUsage;
};

export type SubjectListFilters = {
  search?: string;
  type?: SubjectType;
  sort?: "name" | "type";
};

export type SubjectDeleteGuards = {
  roomsCount: number;
  requirementsCount: number;
  teachersCount: number;
  scheduleTemplatesCount: number;
  scheduleEntriesCount: number;
};
