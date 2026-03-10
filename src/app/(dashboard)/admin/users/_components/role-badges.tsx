import type { UserWithRoles } from "../_lib/types";
import type { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<Role, { label: string; className: string }> = {
  ADMIN: {
    label: "Admin",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25",
  },
  USER: {
    label: "User",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function RoleBadge({ role }: { role: Role }) {
  const style = ROLE_STYLES[role];
  return (
    <span
      className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", style.className)}
    >
      {style.label}
    </span>
  );
}

const DOMAIN_ROLE_STYLES = {
  teacher: {
    label: "Учитель",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
  },
  student: {
    label: "Ученик",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  },
  parent: {
    label: "Родитель",
    className: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/25",
  },
} as const;

export function DomainRoleBadges({ user }: { user: UserWithRoles }) {
  const roles: (keyof typeof DOMAIN_ROLE_STYLES)[] = [];
  if (user.teachers.length > 0) roles.push("teacher");
  if (user.students.length > 0) roles.push("student");
  if (user.parents.length > 0) roles.push("parent");

  if (roles.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => {
        const style = DOMAIN_ROLE_STYLES[role];
        return (
          <span
            key={role}
            className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", style.className)}
          >
            {style.label}
          </span>
        );
      })}
    </div>
  );
}
