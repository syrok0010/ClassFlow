import { useState, useMemo, useCallback, useEffect } from "react";
import type { StudentForAssignment } from "../_lib/types";
import type { SubgroupEditorData } from "../_actions/group-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shuffle, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SubgroupEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SubgroupEditorData | null;
  loading: boolean;
  onSave: (assignments: Record<string, string[]>) => Promise<void>;
}

type BucketMap = Record<string, string[]>;

export function SubgroupEditorDialog({
  open,
  onOpenChange,
  data,
  loading,
  onSave,
}: SubgroupEditorDialogProps) {
  const [saving, setSaving] = useState(false);
  const [buckets, setBuckets] = useState<BucketMap>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initializedFrom, setInitializedFrom] = useState<SubgroupEditorData | null>(null);
  const students = useMemo(() => data?.students ?? [], [data]);
  const siblings = useMemo(() => data?.sibling ?? [], [data]);

  useEffect(() => {
    if (data && data !== initializedFrom) {
      const initial: BucketMap = {};
      for (const sib of data.sibling) {
        initial[sib.id] = [...sib.studentIds];
      }
      setBuckets(initial);
      setInitializedFrom(data);
    }
  }, [data, initializedFrom]);

  const assignedIds = useMemo(() => {
    const set = new Set<string>();
    Object.values(buckets).forEach((ids) => ids.forEach((id) => set.add(id)));
    return set;
  }, [buckets]);

  const unassignedStudents = useMemo(
    () => students.filter((s) => !assignedIds.has(s.id)),
    [students, assignedIds]
  );

  const siblingIds = useMemo(() => siblings.map((s) => s.id), [siblings]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const findBucketOfStudent = useCallback(
    (studentId: string): string | null => {
      for (const [key, ids] of Object.entries(buckets)) {
        if (ids.includes(studentId)) return key;
      }
      return null;
    },
    [buckets]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const studentId = active.id as string;
    const targetBucket =
      (over.data.current?.bucketId as string) ?? (over.id as string);

    if (targetBucket === "unassigned") {
      const sourceBucket = findBucketOfStudent(studentId);
      if (sourceBucket) {
        setBuckets((prev) => ({
          ...prev,
          [sourceBucket]: prev[sourceBucket].filter((id) => id !== studentId),
        }));
      }
      return;
    }

    if (!siblingIds.includes(targetBucket)) return;

    const sourceBucket = findBucketOfStudent(studentId);

    setBuckets((prev) => {
      const next = { ...prev };

      if (sourceBucket) {
        next[sourceBucket] = next[sourceBucket].filter(
          (id) => id !== studentId
        );
      }

      if (!next[targetBucket]) next[targetBucket] = [];
      if (!next[targetBucket].includes(studentId)) {
        next[targetBucket] = [...next[targetBucket], studentId];
      }

      return next;
    });
  };

  const handleAutoSplit = () => {
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const newBuckets: BucketMap = {};
    siblingIds.forEach((key) => (newBuckets[key] = []));
    shuffled.forEach((s, i) => {
      const bucketKey = siblingIds[i % siblingIds.length];
      newBuckets[bucketKey].push(s.id);
    });
    setBuckets(newBuckets);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(buckets);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setBuckets({});
      setInitializedFrom(null);
    }
    onOpenChange(v);
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

  const activeStudent = activeId
    ? students.find((s) => s.id === activeId) ?? null
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
                  Перетащите учеников между подгруппами
                </span>
              </div>

              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `1fr repeat(${siblings.length}, 1fr)`,
                }}
              >
                <DroppableBucket
                  id="unassigned"
                  title={`Нераспределённые (${unassignedStudents.length})`}
                  variant="source"
                >
                  <SortableContext
                    items={unassignedStudents.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {unassignedStudents.map((s) => (
                      <DraggableStudent key={s.id} student={s} />
                    ))}
                  </SortableContext>
                  {unassignedStudents.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Все распределены
                    </p>
                  )}
                </DroppableBucket>

                {siblings.map((sib) => {
                  const bucketStudents = (buckets[sib.id] ?? [])
                    .map((id) => students.find((s) => s.id === id))
                    .filter(Boolean) as StudentForAssignment[];

                  return (
                    <DroppableBucket
                      key={sib.id}
                      id={sib.id}
                      title={`${sib.name} (${bucketStudents.length})`}
                      variant="target"
                    >
                      <SortableContext
                        items={bucketStudents.map((s) => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {bucketStudents.map((s) => (
                          <DraggableStudent
                            key={s.id}
                            student={s}
                            bucketId={sib.id}
                          />
                        ))}
                      </SortableContext>
                      {bucketStudents.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Перетащите сюда
                        </p>
                      )}
                    </DroppableBucket>
                  );
                })}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Отмена
                </Button>
                <Button
                  disabled={!hasChanges || saving}
                  onClick={handleSave}
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  Сохранить
                </Button>
              </DialogFooter>
            </div>

            <DragOverlay>
              {activeStudent && (
                <div className="rounded-md border bg-background px-3 py-1.5 text-sm shadow-lg">
                  {getDisplayName(activeStudent)}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </DialogContent>
    </Dialog>
  );
}

function getDisplayName(s: StudentForAssignment) {
  const parts = [s.user.surname, s.user.name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Без имени";
}

function DroppableBucket({
  id,
  title,
  variant,
  children,
}: {
  id: string;
  title: string;
  variant: "source" | "target";
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { bucketId: id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border min-h-[200px] transition-colors",
        variant === "source" ? "bg-muted/30" : "bg-background",
        isOver && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
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
      <div className="flex-1 p-1.5 flex flex-col gap-0.5 overflow-y-auto max-h-[300px]">
        {children}
      </div>
    </div>
  );
}

function DraggableStudent({
  student,
  bucketId,
}: {
  student: StudentForAssignment;
  bucketId?: string;
}) {
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
        isDragging && "opacity-50"
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-3.5 text-muted-foreground shrink-0" />
      <span className="truncate">{getDisplayName(student)}</span>
    </div>
  );
}
