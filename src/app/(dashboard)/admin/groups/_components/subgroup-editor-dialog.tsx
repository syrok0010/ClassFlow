import {
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import type { StudentForAssignment } from "../_lib/types";
import type { SubgroupEditorData } from "../_actions/group-actions";
import { getStudentDisplayName } from "../_lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shuffle, Loader2 } from "lucide-react";
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
} from "@dnd-kit/core";
import { StudentBucketsBoard } from "./student-buckets-board";

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

    if (!siblingIds.includes(targetBucket)) return;

    const sourceBucket = findBucketOfStudent(studentId);

    if (!sourceBucket || sourceBucket === targetBucket) {
      return;
    }

    if ((buckets[sourceBucket]?.length ?? 0) <= 1) {
      return;
    }

    setBuckets((prev) => {
      const next = { ...prev };

      next[sourceBucket] = next[sourceBucket].filter((id) => id !== studentId);

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
                  Ученик должен оставаться в одной из подгрупп
                </span>
              </div>

              <StudentBucketsBoard
                columns={boardColumns}
                getStudentDisplayName={getStudentDisplayName}
                className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              />

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
