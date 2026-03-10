import type { UserWithRoles } from "../_lib/types";

export function UserCell({ user }: { user: UserWithRoles }) {
  const initials = [user.surname?.[0], user.name?.[0]].filter(Boolean).join("").toUpperCase() || "?";
  const fullName = [user.surname, user.name, user.patronymicName].filter(Boolean).join(" ") || "Без имени";

  const childrenNames = user.parents
    .flatMap((p) =>
      p.studentParents.map((sp) =>
        [sp.student.user.surname, sp.student.user.name].filter(Boolean).join(" ")
      )
    ).filter(Boolean);

  const parentNames = user.students
    .flatMap((s) =>
      s.studentParents.map((sp) =>
        [sp.parent.user.surname, sp.parent.user.name].filter(Boolean).join(" ")
      )
    ).filter(Boolean);

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {initials}
      </div>
      <div className="flex flex-col min-w-0 py-0.5 gap-0.5">
        <span className="font-medium text-sm truncate">{fullName}</span>
        {user.email && (
          <span className="text-xs text-muted-foreground truncate">{user.email}</span>
        )}

        {childrenNames.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {childrenNames.map((name, i) => (
              <span key={`child-${i}`} className="inline-flex items-center rounded-md border border-violet-200 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:border-violet-800 dark:text-violet-400">
                {name}
              </span>
            ))}
          </div>
        )}

        {parentNames.length > 0 && childrenNames.length === 0 && (
          <div className="flex flex-wrap gap-1">
            {parentNames.map((name, i) => (
              <span key={`parent-${i}`} className="inline-flex items-center rounded-md border border-emerald-200 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:border-emerald-800 dark:text-emerald-400">
                Опекун: {name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
