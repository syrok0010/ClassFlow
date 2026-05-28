import { useMemo, useState } from "react";
import { useDebouncedValue } from "@tanstack/react-pacer";
import type { GroupWithDetails, StudentForAssignment } from "../_lib/types";
import type { GroupsCrudCommands } from "../_hooks/use-groups-crud";
import {
  useStudentBucketDnd,
  type StudentBucketMap,
} from "../_hooks/use-student-bucket-dnd";
import { getStudentDisplayName } from "../_lib/utils";
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
  DragOverlay,
} from "@dnd-kit/core";
import { StudentBucketsBoard } from "./student-buckets-board";

interface StudentAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupWithDetails | null;
  students: {
    assigned: StudentForAssignment[];
    available: StudentForAssignment[];
  } | null;
  loading: boolean;
  command: GroupsCrudCommands["transferStudents"];
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
  command,
}: StudentAssignmentDialogProps) {
  const [buckets, setBuckets] = useState<StudentBucketMap>(() => ({
    unassigned: students?.available.map((student) => student.id) ?? [],
    assigned: students?.assigned.map((student) => student.id) ?? [],
  }));
  const [leftSearch, setLeftSearch] = useState("");
  const [debouncedLeftSearch] = useDebouncedValue(leftSearch, { wait: 350 });
  const [leftClassFilter, setLeftClassFilter] = useState("ALL");

  const studentById = useMemo(() => {
    if (!students) return new Map<string, StudentForAssignment>();
    return new Map(
      [...students.available, ...students.assigned].map((s) => [s.id, s])
    );
  }, [students]);

  const leftStudents = useMemo(
    () =>
      (buckets.unassigned ?? [])
        .map((id) => studentById.get(id))
        .filter(Boolean) as StudentForAssignment[],
    [buckets.unassigned, studentById]
  );

  const rightStudents = useMemo(
    () =>
      (buckets.assigned ?? [])
        .map((id) => studentById.get(id))
        .filter(Boolean) as StudentForAssignment[],
    [buckets.assigned, studentById]
  );

  const filteredLeftStudents = useMemo(() => {
    return leftStudents.filter((s) => {
      if (debouncedLeftSearch) {
        const name = getStudentDisplayName(s).toLowerCase();
        if (!name.includes(debouncedLeftSearch.toLowerCase())) return false;
      }
      if (leftClassFilter !== "ALL") {
        const cls = getStudentClassInfo(s);
        if (cls !== leftClassFilter) return false;
      }
      return true;
    });
  }, [leftStudents, debouncedLeftSearch, leftClassFilter]);

  const availableClasses = useMemo(() => {
    const classes = new Set<string>();
    leftStudents.forEach((s) => {
      const cls = getStudentClassInfo(s);
      if (cls) classes.add(cls);
    });
    return Array.from(classes).sort();
  }, [leftStudents]);

  const { activeId, handleDragEnd, handleDragStart, sensors } =
    useStudentBucketDnd({
      bucketIds: ["unassigned", "assigned"],
      buckets,
      canMove: ({ sourceBucket }) => Boolean(sourceBucket),
      setBuckets,
    });

  const handleSave = async () => {
    if (!group || !students) return;

    const initialAssigned = new Set(students.assigned.map((s) => s.id));
    const currentAssigned = new Set(buckets.assigned ?? []);

    const toAssign = Array.from(currentAssigned).filter((id) => !initialAssigned.has(id));
    const toRemove = Array.from(initialAssigned).filter((id) => !currentAssigned.has(id));

    if (toAssign.length === 0 && toRemove.length === 0) {
      onOpenChange(false);
      return;
    }

    const result = await command.execute({ group, toAssign, toRemove });
    if (result === null) {
      return;
    }

    setLeftSearch("");
    setLeftClassFilter("ALL");
    onOpenChange(false);
  };

  const hasChanges = useMemo(() => {
    if (!students) return false;
    const initial = students.assigned.map((s) => s.id);
    const assigned = buckets.assigned ?? [];
    if (initial.length !== assigned.length) return true;
    const currentSet = new Set(assigned);
    return initial.some((id) => !currentSet.has(id));
  }, [students, buckets.assigned]);

  const classFilterItems = useMemo(() => {
    const map: Record<string, string> = { ALL: "Все" };
    availableClasses.forEach((cls) => { map[cls] = cls; });
    return map;
  }, [availableClasses]);

  const isElective = group?.type === "ELECTIVE_GROUP";
  const activeStudent = activeId ? studentById.get(activeId) ?? null : null;
  const boardColumns = useMemo(
    () => [
      {
        id: "unassigned",
        tone: "source" as const,
        header: (
          <>
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
          </>
        ),
        students: filteredLeftStudents,
        emptyMessage: "Нет учеников",
        chipBucketId: "unassigned",
        renderStudentEnd: isElective
          ? (s: StudentForAssignment) => {
              const className = getStudentClassInfo(s);
              if (!className) return null;

              return (
                <span className="text-xs text-muted-foreground">{className}</span>
              );
            }
          : undefined,
      },
      {
        id: "assigned",
        tone: "target" as const,
        header: (
          <>
            <p className="text-sm font-medium">
              Состав {group?.name ?? ""}{" "}
              <span className="text-muted-foreground">({rightStudents.length})</span>
            </p>
            <div className="h-7" />
          </>
        ),
        students: rightStudents,
        emptyMessage: "Пусто",
        chipBucketId: "assigned",
      },
    ],
    [
      availableClasses,
      classFilterItems,
      filteredLeftStudents,
      group?.name,
      isElective,
      leftClassFilter,
      leftSearch,
      rightStudents,
    ]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <div className="flex flex-col gap-3 min-h-87.5">
              <StudentBucketsBoard
                columns={boardColumns}
                getStudentDisplayName={getStudentDisplayName}
              />
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
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            disabled={!hasChanges || command.isPending}
            onClick={handleSave}
          >
            {command.isPending && <Loader2 className="size-4 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
