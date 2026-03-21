import { useState, useMemo, useCallback } from "react";
import type {
  GroupWithDetails,
  StudentForAssignment,
  SubjectOption,
} from "../_lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Shuffle, ArrowRight, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
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

interface SplitterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupWithDetails | null;
  students: StudentForAssignment[];
  subjects: SubjectOption[];
  onSave: (data: {
    parentGroupId: string;
    subjectId: string;
    subgroups: { name: string; studentIds: string[] }[];
  }) => Promise<void>;
}

type SplitterStep = "settings" | "distribute";

type BucketMap = Record<string, string[]>;

export function SplitterDialog({
  open,
  onOpenChange,
  group,
  students,
  subjects,
  onSave,
}: SplitterDialogProps) {
  const [step, setStep] = useState<SplitterStep>("settings");
  const [saving, setSaving] = useState(false);

  const [buckets, setBuckets] = useState<BucketMap>({});
  const [activeId, setActiveId] = useState<string | null>(null);


  const settingsForm = useForm({
    defaultValues: {
      subjectId: "",
      subgroupCount: 2,
    },
    onSubmit: ({ value }) => {
      const keys = Array.from(
        { length: value.subgroupCount },
        (_, i) => `group-${i + 1}`
      );
      const initial: BucketMap = {};
      keys.forEach((key) => (initial[key] = []));
      setBuckets(initial);
      setStep("distribute");
    },
  });

  const subjectItems = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, s.name])),
    [subjects]
  );

  const subjectId = settingsForm.state.values.subjectId;
  const subgroupCount = settingsForm.state.values.subgroupCount;
  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? "";

  const bucketKeys = useMemo(
    () =>
      Array.from({ length: subgroupCount }, (_, i) => `group-${i + 1}`),
    [subgroupCount]
  );

  const assignedIds = useMemo(() => {
    const set = new Set<string>();
    Object.values(buckets).forEach((ids) => ids.forEach((id) => set.add(id)));
    return set;
  }, [buckets]);

  const unassignedStudents = useMemo(
    () => students.filter((s) => !assignedIds.has(s.id)),
    [students, assignedIds]
  );

  const allAssigned = unassignedStudents.length === 0 && students.length > 0;


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
    const targetBucket = (over.data.current?.bucketId as string) ?? (over.id as string);
    const sourceBucket = findBucketOfStudent(studentId);

    if (targetBucket === "unassigned") {
      if (sourceBucket) {
        setBuckets((prev) => ({
          ...prev,
          [sourceBucket]: prev[sourceBucket].filter((id) => id !== studentId),
        }));
      }
      return;
    }

    if (!bucketKeys.includes(targetBucket)) return;

    setBuckets((prev) => {
      const next = { ...prev };

      if (sourceBucket) {
        next[sourceBucket] = next[sourceBucket].filter((id) => id !== studentId);
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
    bucketKeys.forEach((key) => (newBuckets[key] = []));
    shuffled.forEach((s, i) => {
      const bucketKey = bucketKeys[i % bucketKeys.length];
      newBuckets[bucketKey].push(s.id);
    });
    setBuckets(newBuckets);
  };

  const handleBack = () => {
    setStep("settings");
    setBuckets({});
  };

  const handleSave = async () => {
    if (!group || !subjectId) return;
    setSaving(true);
    try {
      const subgroupsData = bucketKeys.map((key, i) => ({
        name: `${group.name} ${subjectName} ${i + 1}`,
        studentIds: buckets[key] ?? [],
      }));
      await onSave({
        parentGroupId: group.id,
        subjectId,
        subgroups: subgroupsData,
      });
      setStep("settings");
      setBuckets({});
      settingsForm.reset();
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setStep("settings");
      setBuckets({});
      settingsForm.reset();
    }
    onOpenChange(v);
  };

  const activeStudent = activeId
    ? students.find((s) => s.id === activeId) ?? null
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Разделить на подгруппы: {group?.name ?? ""}
          </DialogTitle>
          <DialogDescription>
            {step === "settings"
              ? "Выберите предмет и количество подгрупп"
              : "Распределите учеников по подгруппам"}
          </DialogDescription>
        </DialogHeader>

        {step === "settings" ? (
          <div className="flex flex-col gap-4 py-4">
            <settingsForm.Field
              name="subjectId"
              validators={{
                onBlur: z.string().min(1, "Выберите предмет"),
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Предмет</label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => {
                      field.handleChange(v ?? "");
                      field.handleBlur();
                    }}
                    items={subjectItems}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Выберите предмет" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors.flatMap((e) => e ? [e.message] : []).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </settingsForm.Field>

            <settingsForm.Field
              name="subgroupCount"
              validators={{
                onChange: z.number().int().min(2, "Минимум 2").max(10, "Максимум 10"),
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">
                    Количество подгрупп
                  </label>
                  <Input
                    type="number"
                    min={2}
                    max={10}
                    value={field.state.value}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      field.handleChange(isNaN(v) ? 2 : Math.max(2, Math.min(10, v)));
                    }}
                    onBlur={field.handleBlur}
                    className="w-24"
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors.flatMap((e) => e ? [e.message] : []).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </settingsForm.Field>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Отмена
              </Button>
              <settingsForm.Subscribe selector={(s) => s.canSubmit}>
                {(canSubmit) => (
                  <Button
                    disabled={!canSubmit}
                    onClick={() => settingsForm.handleSubmit()}
                  >
                    Далее
                    <ArrowRight className="size-4" data-icon="inline-end" />
                  </Button>
                )}
              </settingsForm.Subscribe>
            </DialogFooter>
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
                  Разделить поровну
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  Перетащите учеников в подгруппы или используйте автоматическое деление
                </span>
              </div>

              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `1fr repeat(${subgroupCount}, 1fr)`,
                }}
              >
                <DroppableBucket
                  id="unassigned"
                  title={`Нераспределенные (${unassignedStudents.length})`}
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

                {bucketKeys.map((key, i) => {
                  const bucketStudents = (buckets[key] ?? [])
                    .map((id) => students.find((s) => s.id === id))
                    .filter(Boolean) as StudentForAssignment[];

                  return (
                    <DroppableBucket
                      key={key}
                      id={key}
                      title={`Группа ${i + 1} (${bucketStudents.length})`}
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
                            bucketId={key}
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
                <Button variant="outline" onClick={handleBack}>
                  Назад
                </Button>
                <Button
                  disabled={!allAssigned || saving}
                  onClick={handleSave}
                  title={
                    !allAssigned
                      ? "Распределите всех учеников"
                      : undefined
                  }
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  Сохранить и создать подгруппы
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
