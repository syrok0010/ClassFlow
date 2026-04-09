import type { SubjectType } from "@/generated/prisma/client";

export type SubjectRenderInfo = {
  value: SubjectType;
  label: string;
  labelPlural: string;
  marker: string;
  badge: string;
};

export type SubjectFilterType = "ALL" | SubjectType;