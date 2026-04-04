import type { SubjectType } from "@/generated/prisma/client";
import { SUBJECT_BADGES, SUBJECT_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SubjectTypeBadgeProps {
  type: SubjectType;
  className?: string;
}

export function SubjectTypeBadge({ type, className }: SubjectTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        SUBJECT_BADGES[type],
        className
      )}
    >
      {SUBJECT_LABELS[type]}
    </span>
  );
}
