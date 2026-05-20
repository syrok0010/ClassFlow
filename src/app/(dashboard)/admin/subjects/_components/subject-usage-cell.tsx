"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getSubjectUsageDetailsAction } from "../_actions/subject-actions";
import type { SubjectUsage, SubjectUsageDetails } from "../_lib/types";

interface SubjectUsageCellProps {
  subjectId: string;
  usage: SubjectUsage;
}

const usageDetailsCache = new Map<string, SubjectUsageDetails>();
const usageDetailsRequests = new Map<string, Promise<SubjectUsageDetails>>();

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

async function loadSubjectUsageDetails(subjectId: string): Promise<SubjectUsageDetails> {
  const cached = usageDetailsCache.get(subjectId);
  if (cached) {
    return cached;
  }

  const existingRequest = usageDetailsRequests.get(subjectId);
  if (existingRequest) {
    return existingRequest;
  }

  const request = getSubjectUsageDetailsAction(subjectId).then((response) => {
    if (response.error || !response.result) {
      throw new Error(response.error ?? "Не удалось загрузить детали");
    }

    usageDetailsCache.set(subjectId, response.result);
    return response.result;
  });

  usageDetailsRequests.set(subjectId, request);

  try {
    return await request;
  } finally {
    usageDetailsRequests.delete(subjectId);
  }
}

export function SubjectUsageCell({ subjectId, usage }: SubjectUsageCellProps) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<SubjectUsageDetails | null>(
    () => usageDetailsCache.get(subjectId) ?? null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total =
    usage.roomsCount +
    usage.requirementsCount +
    usage.teachersCount +
    usage.scheduleTemplatesCount +
    usage.scheduleEntriesCount;

  const loadDetails = useCallback(async () => {
    if (total === 0 || details || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextDetails = await loadSubjectUsageDetails(subjectId);
      setDetails(nextDetails);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить детали"
      );
    } finally {
      setIsLoading(false);
    }
  }, [details, isLoading, subjectId, total]);

  if (total === 0) {
    return <span className="text-sm text-muted-foreground">Не используется</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        openOnHover={true}
        delay={0}
        onPointerEnter={() => {
          void loadDetails();
        }}
        onFocus={() => {
          void loadDetails();
        }}
        className="text-left text-sm text-muted-foreground underline decoration-dotted underline-offset-4"
      >
        Кабинеты: {usage.roomsCount} · Требования: {usage.requirementsCount} · Учителя: {usage.teachersCount}
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-96 gap-2">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : details ? (
          <div className="space-y-1.5 text-sm">
            <p>
              <span className="font-medium">Кабинеты: </span>
              {renderPreviewList(details.rooms)}
            </p>
            <p>
              <span className="font-medium">Учителя: </span>
              {renderPreviewList(details.teachers)}
            </p>
            <p>
              <span className="font-medium">Требования: </span>
              {renderPreviewList(details.requirements)}
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
