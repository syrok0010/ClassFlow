import { LogOut, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  getRoleSummary,
  getUserFullName,
  getUserInitials,
  type SessionAccessUser,
} from "@/lib/auth-access";

type SidebarUserMenuProps = {
  isExpanded: boolean;
  user: SessionAccessUser;
  onLogout: () => Promise<void>;
};

export function SidebarUserMenu({
  isExpanded,
  user,
  onLogout,
}: SidebarUserMenuProps) {
  return (
    <div className="border-t p-3">
      <Popover>
      <PopoverTrigger
        className="relative h-12 w-full overflow-hidden rounded-md px-0 text-left text-foreground transition-colors hover:bg-muted"
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
  user: SessionAccessUser;
}) {
  const initials = getUserInitials(user);
  const fullName = getUserFullName(user);
  const roleSummary = getRoleSummary(user);

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-0 top-1/2 flex h-full w-10 -translate-y-1/2 items-center justify-center">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
          data-testid="sidebar-profile-avatar"
        >
          {initials}
        </div>
      </div>
      <div
        className={cn(
          "absolute left-12 right-2 top-1/2 flex -translate-y-1/2 flex-col items-start overflow-hidden transition-all duration-200",
          isExpanded ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        title={roleSummary}
      >
          <span className="block w-full truncate whitespace-nowrap text-sm font-medium">{fullName}</span>
          <span className="mt-0.5 block w-full truncate whitespace-nowrap text-xs leading-none text-muted-foreground">
            {roleSummary}
          </span>
      </div>
    </div>
  );
}
