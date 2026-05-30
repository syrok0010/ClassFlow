import { Children, type ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Inbox } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type StudentBucketPanelProps = {
  id: string;
  title?: string;
  variant: "source" | "target";
  children: ReactNode;
  emptyMessage?: string;
  className?: string;
  contentClassName?: string;
  emptyMessageClassName?: string;
};

export function StudentBucketPanel({
  id,
  title,
  variant,
  children,
  emptyMessage,
  className,
  contentClassName,
  emptyMessageClassName,
}: StudentBucketPanelProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { bucketId: id },
  });

  const hasChildren = Children.count(children) > 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border min-h-50 transition-colors h-full",
        variant === "source" ? "bg-muted/30" : "bg-background",
        isOver && "ring-2 ring-primary/50 bg-primary/5",
        className
      )}
    >
      {title && (
        <div
          className={cn(
            "px-3 py-2 text-xs font-medium border-b rounded-t-lg",
            variant === "source"
              ? "bg-muted/50 text-muted-foreground"
              : "bg-primary/5 text-primary"
          )}
        >
          {title}
        </div>
      )}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1.5",
          contentClassName
        )}
      >
        {emptyMessage && !hasChildren ? (
          <Empty className="min-h-full justify-center gap-3 px-3 py-4">
            <EmptyHeader className="gap-2">
              <EmptyMedia
                variant="icon"
                className="size-10 bg-muted/60 [&_svg:not([class*='size-'])]:size-4"
              >
                <Inbox />
              </EmptyMedia>
              <EmptyTitle
                className={cn("text-center text-xs font-medium", emptyMessageClassName)}
              >
                {emptyMessage}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
