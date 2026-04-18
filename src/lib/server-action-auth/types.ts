import type { auth } from "@/lib/auth";

export type SystemRole = "ADMIN" | "USER";
export type DomainRole = "teacher" | "parent" | "student";

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;
export type ActionSession = NonNullable<SessionResult>;

export type ActionContext = {
  session: ActionSession;
  userId: string;
  systemRole: SystemRole;
  domainRoles: DomainRole[];
};

export type TeacherActor = {
  userId: string;
  teacherId: string;
};

export type ParentActor = {
  userId: string;
  parentId: string;
};

export type StudentActor = {
  userId: string;
  studentId: string;
};

export type TeacherScope = {
  actorRole: "ADMIN" | "TEACHER";
  actorUserId: string;
  actorTeacherId?: string;
  targetTeacherId: string;
};
