"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart,
  Building2,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Pin,
  PinOff,
  Settings,
  Users,
  UserSquare2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSidebarStore } from "@/stores/sidebar-store";
import { SIDEBAR_WIDTH } from "./constants";

const ADMIN_LINKS = [
  { name: "Дашборд", href: "/admin", icon: LayoutDashboard },
  { name: "Расписание", href: "/admin/schedule", icon: CalendarDays },
  { name: "Помещения", href: "/admin/rooms", icon: Building2 },
  { name: "Предметы", href: "/admin/subjects", icon: BarChart },
  { name: "Группы", href: "/admin/groups", icon: Users },
  { name: "Пользователи", href: "/admin/users", icon: UserSquare2 },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const { isPinned, togglePin, setPin } = useSidebarStore();

  const isExpanded = isHovered || isPinned;

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-white transition-all duration-300 ease-in-out h-screen fixed left-0 top-0 z-40 shrink-0",
        isExpanded ? SIDEBAR_WIDTH.expanded.width : SIDEBAR_WIDTH.collapsed.width,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ── Header / Logo ── */}
      <div className="relative flex h-16 w-full items-center overflow-hidden border-b shrink-0">
        {/* Expanded: logo + name */}
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

        {/* Collapsed: hamburger icon (click = pin) */}
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

        {/* Expanded: pin/unpin toggle */}
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

      {/* ── Navigation Links ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
        {ADMIN_LINKS.map((link) => {
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname === link.href || pathname?.startsWith(`${link.href}/`);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group/link flex items-center rounded-md text-sm font-medium transition-colors overflow-hidden h-10",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              title={!isExpanded ? link.name : undefined}
            >
              <div className="flex w-10 shrink-0 items-center justify-center h-full">
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground group-hover/link:text-foreground",
                  )}
                />
              </div>
              <span
                className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  isExpanded ? "max-w-40 opacity-100 ml-1" : "max-w-0 opacity-0 ml-0",
                )}
              >
                {link.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ── Footer / User Profile ── */}
      <div className="border-t p-3">
        <Popover>
          <PopoverTrigger
            className="w-full h-12 flex items-center justify-start overflow-hidden rounded-md hover:bg-muted transition-colors cursor-pointer text-foreground"
          >
              <div className="flex w-10 shrink-0 items-center justify-center h-full ml-1">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-medium text-xs">
                  AD
                </div>
              </div>
              <div
                className={cn(
                  "flex flex-col items-start overflow-hidden transition-all duration-300",
                  isExpanded ? "max-w-40 opacity-100 ml-2" : "max-w-0 opacity-0 ml-0",
                )}
              >
                <span className="text-sm font-medium whitespace-nowrap truncate w-35 text-left">
                  Admin User
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap truncate w-35 text-left leading-none mt-0.5">
                  Administrator
                </span>
              </div>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start" side="right" sideOffset={16}>
            <div className="flex flex-col gap-1">
              <div className="px-2 py-1.5 text-sm font-semibold">Мой аккаунт</div>
              <div className="h-px bg-muted my-1" />
              <Button variant="ghost" className="w-full justify-start h-9 px-2 text-sm font-normal">
                <Settings className="mr-2 h-4 w-4" />
                Настройки
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start h-9 px-2 text-sm font-normal text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Выйти
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  );
}
