import { LogOut, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getRoleSummary,
  getUserFullName,
  getUserInitials,
  type DomainRole,
} from "@/lib/auth-access";

type SidebarUser = {
  role?: "ADMIN" | "USER" | string | null;
  domainRoles?: DomainRole[] | null;
  surname?: string | null;
  name?: string | null;
  patronymicName?: string | null;
};

type SidebarUserMenuProps = {
  isExpanded: boolean;
  user?: SidebarUser | null;
  onLogout: () => Promise<void>;
};

export function SidebarUserMenu({
  isExpanded,
  user,
  onLogout,
}: SidebarUserMenuProps) {
  if (!user) {
    return (
      <div className="border-t p-3">
        <div
          className="flex h-12 w-full items-center justify-center overflow-hidden rounded-md px-0"
          data-testid="sidebar-profile-trigger"
        >
          <div className="flex h-full w-10 shrink-0 items-center justify-center">
            <Skeleton className="h-8 w-8 rounded-full" data-testid="sidebar-profile-avatar" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t p-3">
      <Popover>
        <PopoverTrigger
          className={cn(
            "flex h-12 w-full items-center overflow-hidden rounded-md px-0 text-left text-foreground transition-colors hover:bg-muted",
            isExpanded ? "justify-start" : "justify-center",
          )}
          data-testid="sidebar-profile-trigger"
        >
          <SidebarUserMenuContent isExpanded={isExpanded} user={user} />
        </PopoverTrigger>
        <PopoverContent className="w-56" align="start" side="right" sideOffset={16}>
          <div className="flex flex-col gap-1">
            <div className="px-2 py-1.5 text-sm font-semibold">Мой аккаунт</div>
            <div className="my-1 h-px bg-muted" />
            <Button variant="ghost" className="h-9 w-full justify-start px-2 text-sm font-normal">
              <Settings className="mr-2 h-4 w-4" />
              Настройки
            </Button>
            <Button
              variant="ghost"
              onClick={onLogout}
              className="h-9 w-full justify-start px-2 text-sm font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SidebarUserMenuContent({
  isExpanded,
  user,
}: {
  isExpanded: boolean;
  user: SidebarUser;
}) {
  const initials = getUserInitials(user);
  const fullName = getUserFullName(user);
  const roleSummary = getRoleSummary(user);

  return (
    <>
      <div className="flex h-full w-10 shrink-0 items-center justify-center">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
          data-testid="sidebar-profile-avatar"
        >
          {initials}
        </div>
      </div>
      {isExpanded ? (
        <div className="ml-2 flex max-w-40 flex-col items-start overflow-hidden" title={roleSummary}>
          <span className="w-35 truncate whitespace-nowrap text-sm font-medium">{fullName}</span>
          <span className="mt-0.5 w-35 truncate whitespace-nowrap text-xs leading-none text-muted-foreground">
            {roleSummary}
          </span>
        </div>
      ) : null}
    </>
  );
}
