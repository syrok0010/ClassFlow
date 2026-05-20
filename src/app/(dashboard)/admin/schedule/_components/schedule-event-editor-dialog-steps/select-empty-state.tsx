import { cn } from "@/lib/utils";

export function SelectEmptyState({
  className,
  message,
}: {
  className?: string;
  message: string;
}) {
  return (
    <div className={cn("px-2 py-1.5 text-sm text-muted-foreground", className)}>
      {message}
    </div>
  );
}
