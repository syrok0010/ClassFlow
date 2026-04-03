"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import type { SidebarSectionConfig } from "./sidebar-config";

type SidebarSectionProps = {
  isExpanded: boolean;
  pathname: string | null;
  section: SidebarSectionConfig;
};

export function SidebarSection({
  isExpanded,
  pathname,
  section,
}: SidebarSectionProps) {
  return (
    <div
      className="flex flex-col gap-1"
      data-testid={`sidebar-section-${section.id}`}
    >
      <div
        className={cn(
          "px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-all duration-300",
          isExpanded ? "max-h-6 opacity-100" : "max-h-0 overflow-hidden opacity-0",
        )}
      >
        {section.label}
      </div>
      {section.items.map((link) => {
        const isActive =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname === link.href || pathname?.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "group/link flex h-10 items-center overflow-hidden rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            data-testid={`sidebar-link-${link.href.replaceAll("/", "-").replace(/^-/, "")}`}
            title={!isExpanded ? link.name : undefined}
          >
            <div className="flex h-full w-10 shrink-0 items-center justify-center">
              <link.icon
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
                isExpanded ? "ml-1 max-w-40 opacity-100" : "ml-0 max-w-0 opacity-0",
              )}
            >
              {link.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
