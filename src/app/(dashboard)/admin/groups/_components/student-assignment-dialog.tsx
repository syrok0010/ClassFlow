import {
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { GroupWithDetails, StudentForAssignment } from "../_lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
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
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { StudentBucketPanel } from "./student-bucket-panel";
import { DraggableStudentChip } from "./draggable-student-chip";

interface StudentAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupWithDetails | null;
  students: {
    assigned: StudentForAssignment[];
    available: StudentForAssignment[];
  } | null;
  loading: boolean;
  onSave: (toAssign: string[], toRemove: string[]) => Promise<void>;
}

function getStudentDisplayName(s: StudentForAssignment) {
  const parts = [s.user.surname, s.user.name, s.user.patronymicName].filter(
    Boolean
  );
  return parts.length > 0 ? parts.join(" ") : "Без имени";
}

function getStudentClassInfo(s: StudentForAssignment) {
  const classGroup = s.currentGroups.find((g) => g.group.type === "CLASS");
  return classGroup ? classGroup.group.name : null;
}

export function StudentAssignmentDialog({
  open,
  onOpenChange,
  group,
  students,
  loading,
  onSave,
}: StudentAssignmentDialogProps) {
  const [buckets, setBuckets] = useState<Record<"unassigned" | "assigned", string[]>>({
    unassigned: [],
    assigned: [],
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initializedFrom, setInitializedFrom] = useState<string | null>(null);
  const [leftSearch, setLeftSearch] = useState("");
  const [leftClassFilter, setLeftClassFilter] = useState("ALL");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !group || !students) return;
    const assignedKey = students.assigned.map((s) => s.id).join("|");
    const availableKey = students.available.map((s) => s.id).join("|");
    const nextKey = `${group.id}:${assignedKey}:${availableKey}`;
    if (initializedFrom === nextKey) return;
    setBuckets({
      unassigned: students.available.map((s) => s.id),
      assigned: students.assigned.map((s) => s.id),
    });
    setInitializedFrom(nextKey);
  }, [open, group, students, initializedFrom]);

  const studentById = useMemo(() => {
    if (!students) return new Map<string, StudentForAssignment>();
    return new Map(
      [...students.available, ...students.assigned].map((s) => [s.id, s])
    );
  }, [students]);

  const leftStudents = useMemo(
    () => buckets.unassigned.map((id) => studentById.get(id)).filter(Boolean) as StudentForAssignment[],
    [buckets.unassigned, studentById]
  );

  const rightStudents = useMemo(
    () => buckets.assigned.map((id) => studentById.get(id)).filter(Boolean) as StudentForAssignment[],
    [buckets.assigned, studentById]
  );

  const filteredLeftStudents = useMemo(() => {
    return leftStudents.filter((s) => {
      if (leftSearch) {
        const name = getStudentDisplayName(s).toLowerCase();
        if (!name.includes(leftSearch.toLowerCase())) return false;
      }
      if (leftClassFilter !== "ALL") {
        const cls = getStudentClassInfo(s);
        if (cls !== leftClassFilter) return false;
      }
      return true;
    });
  }, [leftStudents, leftSearch, leftClassFilter]);

  const availableClasses = useMemo(() => {
    const classes = new Set<string>();
    leftStudents.forEach((s) => {
      const cls = getStudentClassInfo(s);
      if (cls) classes.add(cls);
    });
    return Array.from(classes).sort();
  }, [leftStudents]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const findBucketOfStudent = useCallback(
    (studentId: string): "unassigned" | "assigned" | null => {
      if (buckets.unassigned.includes(studentId)) return "unassigned";
      if (buckets.assigned.includes(studentId)) return "assigned";
      return null;
    },
    [buckets]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const studentId = active.id as string;
    const targetBucket =
      ((over.data.current?.bucketId as string) ?? (over.id as string)) as
        | "unassigned"
        | "assigned";
    const sourceBucket = findBucketOfStudent(studentId);

    if (!sourceBucket) return;
    if (targetBucket !== "unassigned" && targetBucket !== "assigned") return;

    setBuckets((prev) => {
      const next = {
        unassigned: [...prev.unassigned],
        assigned: [...prev.assigned],
      };

      next[sourceBucket] = next[sourceBucket].filter((id) => id !== studentId);
      if (!next[targetBucket].includes(studentId)) {
        next[targetBucket] = [...next[targetBucket], studentId];
      }

      return next;
    });
  };

  const handleSave = async () => {
    if (!students) return;

    const initialAssigned = new Set(students.assigned.map((s) => s.id));
    const currentAssigned = new Set(buckets.assigned);

    const toAssign = Array.from(currentAssigned).filter((id) => !initialAssigned.has(id));
    const toRemove = Array.from(initialAssigned).filter((id) => !currentAssigned.has(id));

    setSaving(true);
    try {
      await onSave(toAssign, toRemove);
      setLeftSearch("");
      setLeftClassFilter("ALL");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setBuckets({ unassigned: [], assigned: [] });
      setActiveId(null);
      setInitializedFrom(null);
      setLeftSearch("");
      setLeftClassFilter("ALL");
    }
    onOpenChange(v);
  };

  const hasChanges = useMemo(() => {
    if (!students) return false;
    const initial = students.assigned.map((s) => s.id);
    if (initial.length !== buckets.assigned.length) return true;
    const currentSet = new Set(buckets.assigned);
    return initial.some((id) => !currentSet.has(id));
  }, [students, buckets.assigned]);

  const classFilterItems = useMemo(() => {
    const map: Record<string, string> = { ALL: "Все" };
    availableClasses.forEach((cls) => { map[cls] = cls; });
    return map;
  }, [availableClasses]);

  const isElective = group?.type === "ELECTIVE_GROUP";
  const activeStudent = activeId ? studentById.get(activeId) ?? null : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-3xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>
            Состав: {group?.name ?? ""}
          </DialogTitle>
          <DialogDescription>
            Перенесите учеников между списками для изменения состава группы.
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
            <div className="flex flex-col gap-3 min-h-[350px]">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">
                    {isElective ? "Все ученики" : "Свободные ученики"}{" "}
                    <span className="text-muted-foreground">
                      ({filteredLeftStudents.length})
                    </span>
                  </p>

                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Поиск..."
                        value={leftSearch}
                        onChange={(e) => setLeftSearch(e.target.value)}
                        className="h-7 pl-7 text-xs"
                      />
                    </div>
                    {isElective && availableClasses.length > 0 && (
                      <Select
                        value={leftClassFilter}
                        onValueChange={(v) => setLeftClassFilter(v ?? "ALL")}
                        items={classFilterItems}
                      >
                        <SelectTrigger size="sm" className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">Все</SelectItem>
                          {availableClasses.map((cls) => (
                            <SelectItem key={cls} value={cls}>
                              {cls}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <StudentBucketPanel
                    id="unassigned"
                    variant="source"
                    emptyMessage="Нет учеников"
                    className="flex-1 max-h-[280px] min-h-[280px]"
                    contentClassName="p-1.5"
                    emptyMessageClassName="py-6"
                  >
                    <SortableContext
                      items={filteredLeftStudents.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filteredLeftStudents.map((s) => (
                        <DraggableStudentChip
                          key={s.id}
                          student={s}
                          displayName={getStudentDisplayName(s)}
                          bucketId="unassigned"
                          className="gap-2 px-2.5 py-1.5"
                          endSlot={
                            isElective && getStudentClassInfo(s) ? (
                              <span className="text-xs text-muted-foreground">
                                {getStudentClassInfo(s)}
                              </span>
                            ) : null
                          }
                        />
                      ))}
                    </SortableContext>
                  </StudentBucketPanel>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">
                    Состав {group?.name ?? ""}{" "}
                    <span className="text-muted-foreground">
                      ({rightStudents.length})
                    </span>
                  </p>
                  <div className="h-7" />

                  <StudentBucketPanel
                    id="assigned"
                    variant="target"
                    emptyMessage="Пусто"
                    className="flex-1 max-h-[280px] min-h-[280px]"
                    contentClassName="p-1.5"
                    emptyMessageClassName="py-6"
                  >
                    <SortableContext
                      items={rightStudents.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {rightStudents.map((s) => (
                        <DraggableStudentChip
                          key={s.id}
                          student={s}
                          displayName={getStudentDisplayName(s)}
                          bucketId="assigned"
                          className="gap-2 px-2.5 py-1.5"
                        />
                      ))}
                    </SortableContext>
                  </StudentBucketPanel>
                </div>
              </div>
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
      </DialogContent>
    </Dialog>
  );
}
