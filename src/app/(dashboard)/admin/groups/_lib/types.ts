import type { GroupType } from "@/generated/prisma/client";

export type GroupWithDetails = {
  id: string;
  name: string;
  type: GroupType;
  grade: number | null;
  parentId: string | null;
  subjectId: string | null;
  subject: { id: string; name: string } | null;
  _count: { studentGroups: number };
  subGroups: GroupWithDetails[];
};

export type StudentForAssignment = {
  id: string;
  user: {
    id: string;
    name: string | null;
    surname: string | null;
    patronymicName: string | null;
  };
  currentGroups: {
    groupId: string;
    group: { name: string; type: GroupType };
  }[];
};

export type SubjectOption = {
  id: string;
  name: string;
};
