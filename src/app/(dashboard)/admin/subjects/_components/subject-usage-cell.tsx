"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getSubjectUsageDetailsAction } from "../_actions/subject-actions";
import type { SubjectUsage } from "../_lib/types";

interface SubjectUsageCellProps {
  subjectId: string;
  usage: SubjectUsage;
}

function renderPreviewList(items: string[]) {
  if (items.length === 0) {
    return <span className="block text-muted-foreground">Нет</span>;
  }

  return (
      <span className="mt-1 block space-y-0.5">
      {items.map((item) => (
          <span key={item} className="block">
          {item}
        </span>
      ))}
    </span>
  );
}

export function SubjectUsageCell({ subjectId, usage }: SubjectUsageCellProps) {
  const [open, setOpen] = useState(false);
  const [hasRequestedDetails, setHasRequestedDetails] = useState(false);

  const total =
    usage.roomsCount +
    usage.requirementsCount +
    usage.teachersCount +
    usage.scheduleTemplatesCount +
    usage.scheduleEntriesCount;

  const usageDetailsQuery = useQuery({
    queryKey: ["subject-usage-details", subjectId],
    queryFn: async () => {
      const response = await getSubjectUsageDetailsAction(subjectId);
      if (response.error || !response.result) {
        throw new Error(response.error ?? "Не удалось загрузить детали");
      }

      return response.result;
    },
    enabled: total > 0 && (open || hasRequestedDetails),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (total === 0) {
    return <span className="text-sm text-muted-foreground">Не используется</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        openOnHover={true}
        delay={0}
        onPointerEnter={() => setHasRequestedDetails(true)}
        onFocus={() => setHasRequestedDetails(true)}
        className="text-left text-sm text-muted-foreground underline decoration-dotted underline-offset-4"
      >
        Кабинеты: {usage.roomsCount} · Требования: {usage.requirementsCount} · Учителя: {usage.teachersCount}
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-96 gap-2">
        {usageDetailsQuery.error ? (
          <p className="text-sm text-destructive">{usageDetailsQuery.error.message}</p>
        ) : usageDetailsQuery.data ? (
          <div className="space-y-1.5 text-sm">
            <p>
              <span className="font-medium">Кабинеты: </span>
              {renderPreviewList(usageDetailsQuery.data.rooms)}
            </p>
            <p>
              <span className="font-medium">Учителя: </span>
              {renderPreviewList(usageDetailsQuery.data.teachers)}
            </p>
            <p>
              <span className="font-medium">Требования: </span>
              {renderPreviewList(usageDetailsQuery.data.requirements)}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Загружаем связи...
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
