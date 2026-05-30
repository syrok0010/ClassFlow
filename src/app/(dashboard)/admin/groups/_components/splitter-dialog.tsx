import { useState, useMemo } from "react";
import type {
  GroupWithDetails,
  StudentForAssignment,
  SubjectOption,
} from "../_lib/types";
import type { GroupsCrudCommands } from "../_hooks/use-groups-crud";
import {
  useStudentBucketDnd,
  type StudentBucketMap,
} from "../_hooks/use-student-bucket-dnd";
import {
  distributeStudentIdsEvenly,
  getStudentDisplayName,
} from "../_lib/utils";
import { groupNameSchema } from "../_lib/group-schemas";
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
import { Shuffle, ArrowRight } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import {
  DndContext,
  closestCenter,
  DragOverlay,
} from "@dnd-kit/core";
import { StudentBucketsBoard } from "./student-buckets-board";
import { Spinner } from "@/components/ui/spinner";

interface SplitterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupWithDetails | null;
  students: StudentForAssignment[];
  subjects: SubjectOption[];
  command: GroupsCrudCommands["splitGroup"];
}

type SplitterStep = "settings" | "distribute";

export function SplitterDialog({
  open,
  onOpenChange,
  group,
  students,
  subjects,
  command,
}: SplitterDialogProps) {
  const [step, setStep] = useState<SplitterStep>("settings");
  const [buckets, setBuckets] = useState<StudentBucketMap>({});

  const form = useForm({
    defaultValues: {
      subjectId: "",
      subgroupCount: 2,
    },
    onSubmit: ({ value }) => {
      const keys = Array.from(
        { length: value.subgroupCount },
        (_, i) => `group-${i + 1}`
      );
      const initial: StudentBucketMap = {};
      keys.forEach((key) => (initial[key] = []));
      setBuckets(initial);
      setStep("distribute");
    },
  });

  const subjectItems = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, s.name])),
    [subjects]
  );

  const subjectId = form.state.values.subjectId;
  const subgroupCount = form.state.values.subgroupCount;
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

  const hasEmptySubgroup = useMemo(
    () => bucketKeys.some((key) => (buckets[key]?.length ?? 0) === 0),
    [bucketKeys, buckets]
  );

  const { activeId, handleDragEnd, handleDragStart, sensors } =
    useStudentBucketDnd({
      bucketIds: ["unassigned", ...bucketKeys],
      buckets,
      setBuckets,
    });

  const handleAutoSplit = () => {
    setBuckets(
      distributeStudentIdsEvenly(
        students.map((student) => student.id),
        bucketKeys
      )
    );
  };

  const handleBack = () => {
    setStep("settings");
    setBuckets({});
  };

  const handleSave = async () => {
    if (!group || !subjectId) return;

    const subgroupsData = bucketKeys.map((key, i) => ({
      name: groupNameSchema.parse(`${group.name} ${subjectName} ${i + 1}`),
      studentIds: buckets[key] ?? [],
    }));
    const result = await command.execute({
      parentGroupId: group.id,
      subjectId,
      subgroups: subgroupsData,
    });
    if (result === null) {
      return;
    }

    onOpenChange(false);
  };

  const activeStudent = activeId
    ? students.find((s) => s.id === activeId) ?? null
    : null;

  const boardColumns = useMemo(
    () => [
      {
        id: "unassigned",
        title: `Нераспределенные (${unassignedStudents.length})`,
        tone: "source" as const,
        students: unassignedStudents,
        emptyMessage: "Все распределены",
      },
      ...bucketKeys.map((key, i) => {
        const bucketStudents = (buckets[key] ?? [])
          .map((id) => students.find((s) => s.id === id))
          .filter(Boolean) as StudentForAssignment[];

        return {
          id: key,
          title: `Группа ${i + 1} (${bucketStudents.length})`,
          tone: "target" as const,
          students: bucketStudents,
          emptyMessage: "Перетащите сюда",
        };
      }),
    ],
    [buckets, bucketKeys, students, unassignedStudents]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <form.Field
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
            </form.Field>

            <form.Field
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
            </form.Field>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <form.Subscribe selector={(s) => s.canSubmit}>
                {(canSubmit) => (
                  <Button
                    disabled={!canSubmit}
                    onClick={() => form.handleSubmit()}
                  >
                    Далее
                    <ArrowRight className="size-4" data-icon="inline-end" />
                  </Button>
                )}
              </form.Subscribe>
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

              <StudentBucketsBoard
                columns={boardColumns}
                getStudentDisplayName={getStudentDisplayName}
              />

              <DialogFooter>
                <Button variant="outline" onClick={handleBack}>
                  Назад
                </Button>
                <Button
                  disabled={!allAssigned || hasEmptySubgroup || command.isPending}
                  onClick={handleSave}
                  title={
                    !allAssigned
                      ? "Распределите всех учеников"
                      : hasEmptySubgroup
                        ? "В каждой подгруппе должен быть минимум 1 ученик"
                        : undefined
                  }
                >
                  {command.isPending && <Spinner />}
                  Сохранить и создать подгруппы
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
