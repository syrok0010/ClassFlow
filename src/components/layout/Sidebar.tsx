"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Pin, PinOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebarStore } from "@/stores/sidebar-store";
import { SIDEBAR_WIDTH } from "./constants";
import { authClient, useSession } from "@/lib/auth-client";
import { getAccessContexts } from "@/lib/auth-access";
import { SIDEBAR_SECTIONS } from "./sidebar-config";
import { SidebarNavSkeleton } from "./SidebarNavSkeleton";
import { SidebarSection } from "./SidebarSection";
import { SidebarUserMenu } from "./SidebarUserMenu";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const { isPinned, togglePin, setPin } = useSidebarStore();
  const { data: session, isPending } = useSession();

  const isExpanded = isHovered || isPinned;

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  };

  const user = session?.user;
  const visibleSections = user
    ? SIDEBAR_SECTIONS.filter((section) => getAccessContexts(user).includes(section.id))
    : [];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen shrink-0 flex-col overflow-x-hidden border-r bg-white transition-all duration-300 ease-in-out",
        isExpanded ? SIDEBAR_WIDTH.expanded.width : SIDEBAR_WIDTH.collapsed.width,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative flex h-16 w-full items-center overflow-hidden border-b shrink-0">
        <div
          className={cn(
            "absolute left-3 flex items-center gap-2 transition-all duration-300",
            isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none",
          )}
        >
          <div className="h-8 w-8 rounded-md bg-primary flex shrink-0 items-center justify-center text-primary-foreground font-bold">
            CF
          </div>
          <span className="font-semibold text-lg tracking-tight whitespace-nowrap">ClassFlow</span>
        </div>

        <div
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300",
            isExpanded ? "opacity-0 translate-x-4 pointer-events-none" : "opacity-100",
          )}
        >
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setPin(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <div
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300",
            isExpanded ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={togglePin}
            title={isPinned ? "Открепить меню" : "Закрепить меню"}
          >
            {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto px-3 py-4">
        {isPending && <SidebarNavSkeleton />}
        {!isPending && (
          visibleSections.map((section, index) => (
            <div key={section.id} className="relative">
              {index > 0 ? (
                <div
                  className={cn(
                    "pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 transition-opacity duration-200",
                    isExpanded ? "opacity-0" : "opacity-100",
                  )}
                >
                  <div className="h-px w-8 bg-border" />
                </div>
              ) : null}
              <SidebarSection
                isExpanded={isExpanded}
                pathname={pathname}
                section={section}
              />
            </div>
          ))
        )}
      </nav>

      <SidebarUserMenu
        isExpanded={isExpanded}
        user={user ?? null}
        onLogout={handleLogout}
      />
    </aside>
  );
}
