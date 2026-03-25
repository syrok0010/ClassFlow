import type { ReactNode } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { StudentForAssignment } from "../_lib/types";
import { StudentBucketPanel } from "./student-bucket-panel";
import { DraggableStudentChip } from "./draggable-student-chip";
import { cn } from "@/lib/utils";

export type StudentBucketsBoardColumn = {
  id: string;
  title?: string;
  students: StudentForAssignment[];
  emptyMessage?: string;
  tone?: "source" | "target";
  header?: ReactNode;
  chipBucketId?: string;
  renderStudentEnd?: (student: StudentForAssignment) => ReactNode;
};

type StudentBucketsBoardProps = {
  columns: StudentBucketsBoardColumn[];
  getStudentDisplayName: (student: StudentForAssignment) => string;
  className?: string;
};

export function StudentBucketsBoard({
  columns,
  getStudentDisplayName,
  className,
}: StudentBucketsBoardProps) {
  return (
    <div className={cn("grid gap-3", className)}>
      {columns.map((column) => (
        <div key={column.id} className="flex flex-col gap-2">
          {column.header}
          <StudentBucketPanel
            id={column.id}
            title={column.title}
            variant={column.tone ?? "target"}
            emptyMessage={column.emptyMessage}
          >
            <SortableContext
              items={column.students.map((student) => student.id)}
              strategy={verticalListSortingStrategy}
            >
              {column.students.map((student) => (
                <DraggableStudentChip
                  key={student.id}
                  student={student}
                  displayName={getStudentDisplayName(student)}
                  bucketId={column.chipBucketId ?? column.id}
                  endSlot={column.renderStudentEnd?.(student)}
                />
              ))}
            </SortableContext>
          </StudentBucketPanel>
        </div>
      ))}
    </div>
  );
}
