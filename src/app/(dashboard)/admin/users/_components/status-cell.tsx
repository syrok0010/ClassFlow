"use client";

import { useSyncExternalStore } from "react";
import type { UserWithRoles } from "../_lib/types";

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function StatusCell({ user }: { user: UserWithRoles }) {
  const isMounted = useIsMounted();

  const getDaysSince = () => {
    const now = new Date();
    const createdAt = new Date(user.createdAt);
    return Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (user.status === "ACTIVE") {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm text-foreground font-medium">Активен</span>
      </div>
    );
  }

  if (user.status === "PENDING_INVITE") {
    const daysSince = isMounted ? getDaysSince() : 0;
    
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        </span>
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Ожидает активации
          </span>
          <div className="overflow-hidden h-4">
            {!isMounted ? (
              <div className="h-2 w-24 bg-muted animate-pulse rounded mt-1.5" />
            ) : (
              <span className="text-[11px] text-muted-foreground/60 animate-in fade-in slide-in-from-top-1 duration-500 block">
                {daysSince > 0 ? `отправлен ${daysSince} дн. назад` : "отправлен только что"}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500/60" />
      </span>
      <span className="text-sm text-muted-foreground">Заблокирован</span>
    </div>
  );
}
