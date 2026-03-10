import type { UserWithRoles } from "../_lib/types";

export function StatusCell({ user }: { user: UserWithRoles }) {
  if (user.status === "ACTIVE") {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm text-foreground">Активен</span>
      </div>
    );
  }

  if (user.status === "PENDING_INVITE") {
    const daysSince = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        </span>
        <span className="text-sm text-muted-foreground">
          Ожидает{daysSince > 0 ? `: отправлен ${daysSince} дн. назад` : ": только что"}
        </span>
      </div>
    );
  }

  // DISABLED
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500/60" />
      </span>
      <span className="text-sm text-muted-foreground">Заблокирован</span>
    </div>
  );
}
