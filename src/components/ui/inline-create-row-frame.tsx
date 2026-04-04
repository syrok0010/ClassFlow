import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface InlineCreateRowFrameProps {
  children: ReactNode;
  className?: string;
}

interface InlineCreateRowFrameActionsProps {
  onSave: () => void;
  onCancel: () => void;
  isSaveDisabled?: boolean;
  isCancelDisabled?: boolean;
  align?: "start" | "end";
}

export function InlineCreateRowFrame({ children, className }: InlineCreateRowFrameProps) {
  return (
    <TableRow className={cn("animate-in fade-in-0 slide-in-from-top-1 bg-primary/5", className)}>
      {children}
    </TableRow>
  );
}

export function InlineCreateRowFrameActions({
  onSave,
  onCancel,
  isSaveDisabled,
  isCancelDisabled,
  align = "start",
}: InlineCreateRowFrameActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", align === "end" && "justify-end") }>
      <Button size="sm" onClick={onSave} disabled={isSaveDisabled}>
        Сохранить
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel} disabled={isCancelDisabled}>
        Отмена
      </Button>
    </div>
  );
}
