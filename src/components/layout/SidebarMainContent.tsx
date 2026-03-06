"use client";

import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";
import { SIDEBAR_WIDTH } from "./Sidebar";

export function SidebarMainContent({ children }: { children: React.ReactNode }) {
  const isPinned = useSidebarStore((s) => s.isPinned);

  return (
    <main
      className={cn(
        "flex-1 transition-all duration-300 ease-in-out bg-slate-50 p-6 md:p-8 w-full min-h-screen overflow-x-hidden",
        isPinned ? SIDEBAR_WIDTH.expanded.margin : SIDEBAR_WIDTH.collapsed.margin,
      )}
    >
      {children}
    </main>
  );
}
