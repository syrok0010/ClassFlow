"use client";

import { useState } from "react";
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

type SubjectUsageStatus = "idle" | "loading" | "success" | "error";

const PREVIEW_LIMIT = 6;

function renderPreviewList(items: string[]) {
  const visible = items.slice(0, PREVIEW_LIMIT);
  const hidden = items.length - visible.length;

  if (visible.length === 0) {
    return <span className="text-muted-foreground">Нет</span>;
  }

  return (
    <>
      {visible.join(", ")}
      {hidden > 0 ? ` и еще ${hidden}` : ""}
    </>
  );
}

export function SubjectUsageCell({ subjectId, usage }: SubjectUsageCellProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SubjectUsageStatus>("idle");
  const [details, setDetails] = useState<SubjectUsageDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total =
    usage.roomsCount +
    usage.requirementsCount +
    usage.teachersCount +
    usage.scheduleTemplatesCount +
    usage.scheduleEntriesCount;

  const loadDetails = async () => {
    if (total === 0 || status === "loading" || status === "success") {
      return;
    }

    setStatus("loading");
    setError(null);

    const response = await getSubjectUsageDetailsAction(subjectId);
    if (response.error || !response.result) {
      setDetails(null);
      setError(response.error ?? "Не удалось загрузить детали");
      setStatus("error");
      return;
    }

    setDetails(response.result);
    setStatus("success");
  };

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
        {status === "loading" || status === "idle" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Загружаем связи...
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <div className="space-y-1.5 text-sm">
            <p>
              <span className="font-medium">Кабинеты: </span>
              {renderPreviewList(details?.rooms ?? [])}
            </p>
            <p>
              <span className="font-medium">Учителя: </span>
              {renderPreviewList(details?.teachers ?? [])}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
