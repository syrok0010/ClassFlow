import { headers } from "next/headers";
import { forbidden } from "next/navigation";
import { auth } from "@/lib/auth";
import type { ActionContext, DomainRole, SystemRole } from "./types";

const DOMAIN_ROLES: DomainRole[] = ["teacher", "parent", "student"];

function isDomainRole(value: string): value is DomainRole {
  return DOMAIN_ROLES.includes(value as DomainRole);
}

function toSystemRole(value: string | null | undefined): SystemRole {
  return value === "ADMIN" ? "ADMIN" : "USER";
}

function toDomainRoles(value: unknown): DomainRole[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((role): role is DomainRole => typeof role === "string" && isDomainRole(role));
}

export async function getActionContext(): Promise<ActionContext | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  return {
    session,
    userId: session.user.id,
    systemRole: toSystemRole(session.user.role),
    domainRoles: toDomainRoles(session.user.domainRoles),
  };
}

export async function requireActionContext(): Promise<ActionContext> {
  const context = await getActionContext();

  if (!context) {
    forbidden();
  }

  return context;
}

export async function requireAdminContext(): Promise<ActionContext> {
  const context = await requireActionContext();

  if (context.systemRole !== "ADMIN") {
    forbidden();
  }

  return context;
}
