import { useState, useMemo } from "react";
import type { StudentForAssignment } from "../_lib/types";
import type { SubgroupEditorData } from "../_actions/group-actions";
import type { GroupsCrudCommands } from "../_hooks/use-groups-crud";
import {
  useStudentBucketDnd,
  type StudentBucketMap,
} from "../_hooks/use-student-bucket-dnd";
import {
  distributeStudentIdsEvenly,
  getStudentDisplayName,
} from "../_lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shuffle } from "lucide-react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
} from "@dnd-kit/core";
import { StudentBucketsBoard } from "./student-buckets-board";
import { Spinner } from "@/components/ui/spinner";

interface SubgroupEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SubgroupEditorData | null;
  loading: boolean;
  command: GroupsCrudCommands["redistributeSubgroups"];
}

export function SubgroupEditorDialog({
  open,
  onOpenChange,
  data,
  loading,
  command,
}: SubgroupEditorDialogProps) {
  const [buckets, setBuckets] = useState<StudentBucketMap>(() =>
    Object.fromEntries(
      data?.sibling.map((sibling) => [sibling.id, [...sibling.studentIds]]) ??
        []
    )
  );
  const students = useMemo(() => data?.students ?? [], [data]);
  const siblings = useMemo(() => data?.sibling ?? [], [data]);

  const siblingIds = useMemo(() => siblings.map((s) => s.id), [siblings]);

  const { activeId, handleDragEnd, handleDragStart, sensors } =
    useStudentBucketDnd({
      bucketIds: siblingIds,
      buckets,
      canMove: ({ sourceBucket, targetBucket }) =>
        Boolean(sourceBucket) &&
        sourceBucket !== targetBucket &&
        (buckets[sourceBucket ?? ""]?.length ?? 0) > 1,
      setBuckets,
    });

  const handleAutoSplit = () => {
    setBuckets(
      distributeStudentIdsEvenly(
        students.map((student) => student.id),
        siblingIds
      )
    );
  };

  const handleSave = async () => {
    const result = await command.execute(buckets);
    if (result === null) {
      return;
    }

    onOpenChange(false);
  };

  const hasChanges = useMemo(() => {
    if (!data) return false;
    for (const sib of data.sibling) {
      const current = buckets[sib.id] ?? [];
      const original = sib.studentIds;
      if (current.length !== original.length) return true;
      const currentSet = new Set(current);
      if (original.some((id) => !currentSet.has(id))) return true;
    }
    return false;
  }, [data, buckets]);

  const boardColumns = useMemo(
    () =>
      siblings.map((sib) => {
        const bucketStudents = (buckets[sib.id] ?? [])
          .map((id) => students.find((s) => s.id === id))
          .filter(Boolean) as StudentForAssignment[];

        return {
          id: sib.id,
          title: `${sib.name} (${bucketStudents.length})`,
          tone: "target" as const,
          students: bucketStudents,
          emptyMessage: "Перетащите сюда",
        };
      }),
    [buckets, siblings, students]
  );

  const activeStudent = activeId
    ? students.find((s) => s.id === activeId) ?? null
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Редактирование подгрупп: {data?.parentGroupName ?? ""}{" "}
            ({data?.subjectName ?? ""})
          </DialogTitle>
          <DialogDescription>
            Распределите учеников класса по подгруппам.
            Перетаскивайте учеников между колонками.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoSplit}
                >
                  <Shuffle className="size-3.5" data-icon="inline-start" />
                  Перемешать поровну
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  Ученик должен оставаться в одной из подгрупп
                </span>
              </div>

              <StudentBucketsBoard
                columns={boardColumns}
                getStudentDisplayName={getStudentDisplayName}
              />

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Отмена
                </Button>
                <Button
                  disabled={!hasChanges || command.isPending}
                  onClick={handleSave}
                >
                  {command.isPending && <Spinner />}
                  Сохранить
                </Button>
              </DialogFooter>
            </div>

            <DragOverlay>
              {activeStudent && (
                <div className="rounded-md border bg-background px-3 py-1.5 text-sm shadow-lg">
                  {getStudentDisplayName(activeStudent)}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </DialogContent>
    </Dialog>
  );
}
