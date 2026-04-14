export type DomainRole = "teacher" | "parent" | "student";
export type AccessContext = "admin" | DomainRole;

export type SessionAccessUser = {
  role?: "ADMIN" | "USER" | string | null;
  domainRoles?: DomainRole[] | null;
  surname?: string | null;
  name?: string | null;
  patronymicName?: string | null;
};

const CONTEXT_ORDER: AccessContext[] = ["admin", "teacher", "parent", "student"];

const CONTEXT_LABELS: Record<AccessContext, string> = {
  admin: "Администратор",
  teacher: "Учитель",
  parent: "Родитель",
  student: "Ученик",
};

export function getAccessContexts(user: SessionAccessUser): AccessContext[] {
  const domainRoles = new Set(user.domainRoles ?? []);

  return CONTEXT_ORDER.filter((context) => {
    if (context === "admin") {
      return user.role === "ADMIN";
    }

    return domainRoles.has(context);
  });
}

export function getDefaultPath(user: SessionAccessUser): string | null {
  const primaryContext = getAccessContexts(user)[0];
  return primaryContext ? `/${primaryContext}` : null;
}

export function getRoleSummary(user: SessionAccessUser): string {
  const contexts = getAccessContexts(user);

  if (contexts.length === 0) {
    return "Без роли";
  }

  return contexts.map((context) => CONTEXT_LABELS[context]).join(", ");
}
export function getUserFullName(user: {
  surname?: string | null;
  name?: string | null;
  patronymicName?: string | null;
}): string {
  return [user.surname, user.name, user.patronymicName].filter(Boolean).join(" ");
}

export function getUserInitials(user: {
  surname?: string | null;
  name?: string | null;
}): string {
  const initials = `${user.surname?.[0] ?? ""}${user.name?.[0] ?? ""}`.toUpperCase();
  return initials || "CF";
}
