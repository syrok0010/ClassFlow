import type { SubjectType } from "@/generated/prisma/client";
import { ReactNode } from "react";

export type SubjectRenderInfo = {
  value: SubjectType;
  label: string;
  labelPlural: string;
  marker: string;
  badge: string;
};

export type SubjectFilterType = "ALL" | SubjectType;

export type EmptyStateConfig = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};