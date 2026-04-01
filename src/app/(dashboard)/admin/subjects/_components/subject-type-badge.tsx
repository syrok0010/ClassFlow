import type { SubjectType } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import {
  SUBJECT_BADGES,
  SUBJECT_LABELS,
} from "../_lib/constants";

interface SubjectTypeBadgeProps {
  type: SubjectType;
}

export function SubjectTypeBadge({ type }: SubjectTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
          SUBJECT_BADGES[type]
      )}
    >
      {SUBJECT_LABELS[type]}
    </span>
  );
}
