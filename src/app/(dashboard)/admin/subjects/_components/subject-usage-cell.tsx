import { useRef, useState } from "react";
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
  const [isLoading, setIsLoading] = useState(false);
  const [details, setDetails] = useState<SubjectUsageDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const total =
    usage.roomsCount +
    usage.requirementsCount +
    usage.teachersCount +
    usage.scheduleTemplatesCount +
    usage.scheduleEntriesCount;

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen || total === 0 || loadedRef.current || isLoading) {
      return;
    }

    setIsLoading(true);
    void getSubjectUsageDetailsAction(subjectId)
      .then((response) => {
        if (response.error || !response.result) {
          setError(response.error ?? "Не удалось загрузить детали");
          return;
        }

        setDetails(response.result);
        loadedRef.current = true;
      })
      .finally(() => setIsLoading(false));
  };

  if (total === 0) {
    return <span className="text-sm text-muted-foreground">Не используется</span>;
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger openOnHover={true}
        className="text-left text-sm text-muted-foreground underline decoration-dotted underline-offset-4"
      >
        Кабинеты: {usage.roomsCount} · Требования: {usage.requirementsCount} · Учителя: {usage.teachersCount}
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-96 gap-2">
        {isLoading ? (
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
