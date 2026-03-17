"use client";

import { useState, useMemo } from "react";
import type { GroupWithDetails, StudentForAssignment } from "../types";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupWithDetails | null;
  students: {
    assigned: StudentForAssignment[];
    available: StudentForAssignment[];
  } | null;
  loading: boolean;
  onSave: (toAssign: string[], toRemove: string[]) => Promise<void>;
};

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
}: Props) {
  const [leftSelected, setLeftSelected] = useState<Set<string>>(new Set());
  const [rightSelected, setRightSelected] = useState<Set<string>>(new Set());
  const [leftSearch, setLeftSearch] = useState("");
  const [leftClassFilter, setLeftClassFilter] = useState("ALL");
  const [saving, setSaving] = useState(false);

  const [movedToRight, setMovedToRight] = useState<Set<string>>(new Set());
  const [movedToLeft, setMovedToLeft] = useState<Set<string>>(new Set());

  const leftStudents = useMemo(() => {
    if (!students) return [];
    const all = [
      ...students.available.filter((s) => !movedToRight.has(s.id)),
      ...students.assigned.filter((s) => movedToLeft.has(s.id)),
    ];
    return all;
  }, [students, movedToRight, movedToLeft]);

  const rightStudents = useMemo(() => {
    if (!students) return [];
    const all = [
      ...students.assigned.filter((s) => !movedToLeft.has(s.id)),
      ...students.available.filter((s) => movedToRight.has(s.id)),
    ];
    return all;
  }, [students, movedToRight, movedToLeft]);

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

  const handleMoveRight = () => {
    leftSelected.forEach((id) => {
      if (movedToLeft.has(id)) {
        setMovedToLeft((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        setMovedToRight((prev) => new Set(prev).add(id));
      }
    });
    setLeftSelected(new Set());
  };

  const handleMoveLeft = () => {
    rightSelected.forEach((id) => {
      if (movedToRight.has(id)) {
        setMovedToRight((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        setMovedToLeft((prev) => new Set(prev).add(id));
      }
    });
    setRightSelected(new Set());
  };

  const handleMoveAllRight = () => {
    filteredLeftStudents.forEach((s) => {
      if (movedToLeft.has(s.id)) {
        setMovedToLeft((prev) => {
          const next = new Set(prev);
          next.delete(s.id);
          return next;
        });
      } else {
        setMovedToRight((prev) => new Set(prev).add(s.id));
      }
    });
    setLeftSelected(new Set());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave([...movedToRight], [...movedToLeft]);
      setMovedToRight(new Set());
      setMovedToLeft(new Set());
      setLeftSelected(new Set());
      setRightSelected(new Set());
      setLeftSearch("");
      setLeftClassFilter("ALL");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setMovedToRight(new Set());
      setMovedToLeft(new Set());
      setLeftSelected(new Set());
      setRightSelected(new Set());
      setLeftSearch("");
      setLeftClassFilter("ALL");
    }
    onOpenChange(v);
  };

  const hasChanges = movedToRight.size > 0 || movedToLeft.size > 0;

  const classFilterItems = useMemo(() => {
    const map: Record<string, string> = { ALL: "Все" };
    availableClasses.forEach((cls) => { map[cls] = cls; });
    return map;
  }, [availableClasses]);

  const isElective = group?.type === "ELECTIVE_GROUP";

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
          <div className="grid grid-cols-[1fr_auto_1fr] gap-3 min-h-[350px]">
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

              <div className="flex-1 overflow-y-auto rounded-lg border max-h-[280px]">
                {filteredLeftStudents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Нет учеников
                  </p>
                ) : (
                  filteredLeftStudents.map((s) => (
                    <StudentRow
                      key={s.id}
                      student={s}
                      selected={leftSelected.has(s.id)}
                      showClass={isElective}
                      onToggle={() =>
                        setLeftSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id);
                          else next.add(s.id);
                          return next;
                        })
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={leftSelected.size === 0}
                onClick={handleMoveRight}
                title="Перенести выбранных"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={filteredLeftStudents.length === 0}
                onClick={handleMoveAllRight}
                title="Перенести всех"
              >
                <ChevronsRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={rightSelected.size === 0}
                onClick={handleMoveLeft}
                title="Убрать выбранных"
              >
                <ChevronLeft className="size-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                Состав {group?.name ?? ""}{" "}
                <span className="text-muted-foreground">
                  ({rightStudents.length})
                </span>
              </p>
              <div className="h-7" />
              <div className="flex-1 overflow-y-auto rounded-lg border max-h-[280px]">
                {rightStudents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Пусто
                  </p>
                ) : (
                  rightStudents.map((s) => (
                    <StudentRow
                      key={s.id}
                      student={s}
                      selected={rightSelected.has(s.id)}
                      showClass={false}
                      onToggle={() =>
                        setRightSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id);
                          else next.add(s.id);
                          return next;
                        })
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </div>
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

function StudentRow({
  student,
  selected,
  showClass,
  onToggle,
}: {
  student: StudentForAssignment;
  selected: boolean;
  showClass: boolean;
  onToggle: () => void;
}) {
  const classInfo = getStudentClassInfo(student);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 cursor-pointer border-b last:border-b-0 transition-colors text-sm",
        selected ? "bg-primary/10" : "hover:bg-muted/50"
      )}
      onClick={onToggle}
    >
      <Checkbox
        checked={selected}
        tabIndex={-1}
        className="size-3.5 pointer-events-none"
      />
      <span className="flex-1 truncate">
        {getStudentDisplayName(student)}
      </span>
      {showClass && classInfo && (
        <span className="text-xs text-muted-foreground">{classInfo}</span>
      )}
    </div>
  );
}
