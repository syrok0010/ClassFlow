"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string> {
  label: React.ReactNode;
  value: T;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedControlOption<T>[];
  className?: string;
  size?: "sm" | "default";
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "default",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={isActive}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex items-center justify-center whitespace-nowrap rounded-md px-3 font-medium transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              size === "default" ? "h-8 text-sm" : "h-7 text-xs px-2.5",
              isActive ? "text-foreground shadow-xs" : "hover:text-foreground"
            )}
          >
            {isActive && (
              <span className="absolute inset-0 rounded-md bg-background shadow-sm ring-1 ring-foreground/5 duration-200 animate-in fade-in zoom-in-95" />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
