import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { StudentForAssignment } from "../_lib/types";

type DraggableStudentChipProps = {
  student: StudentForAssignment;
  displayName: string;
  bucketId?: string;
  className?: string;
  endSlot?: ReactNode;
};

export function DraggableStudentChip({
  student,
  displayName,
  bucketId,
  className,
  endSlot,
}: DraggableStudentChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: student.id,
    data: { bucketId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-sm cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        className
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
      <span className="truncate flex-1">{displayName}</span>
      {endSlot}
    </div>
  );
}
