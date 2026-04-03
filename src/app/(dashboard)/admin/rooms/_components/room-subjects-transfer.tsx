"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Minus, Search } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateRoomSubjectsAction } from "../_actions/room-actions";
import type { SubjectLite } from "../_lib/types";

type RoomSubjectsTransferProps = {
  roomId: string;
  roomName: string;
  allSubjects: SubjectLite[];
  selectedSubjectIds: string[];
  queryKey: readonly string[];
};

function SubjectBucket({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div className="rounded-xl border bg-background/70 flex flex-col flex-1">
      <div className="border-b px-3 py-2 text-sm font-semibold">{title}</div>
      <div
        ref={setNodeRef}
        className={cn(
          " p-3 transition-colors rounded-b-xl grow",
          isOver ? "bg-primary/10" : "bg-transparent",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function SubjectPill({
  subject,
  inAllowed,
  onToggle,
}: {
  subject: SubjectLite;
  inAllowed: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: subject.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "mb-2 flex items-center justify-between gap-2 rounded-lg border bg-card px-2 py-1.5 text-sm",
        isDragging && "opacity-70",
      )}
      {...listeners}
      {...attributes}
    >
      <span className="truncate">{subject.name}</span>
      <Button size="icon-xs" variant={inAllowed ? "destructive" : "outline"} onClick={onToggle}>
        {inAllowed ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

export function RoomSubjectsTransfer({
  roomId,
  roomName,
  allSubjects,
  selectedSubjectIds,
  queryKey,
}: RoomSubjectsTransferProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [localSelected, setLocalSelected] = useState<string[]>(selectedSubjectIds);

  useEffect(() => {
    setLocalSelected(selectedSubjectIds);
  }, [selectedSubjectIds]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const filteredSubjects = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return allSubjects;
    return allSubjects.filter((subject) => subject.name.toLowerCase().includes(needle));
  }, [allSubjects, search]);

  const mutation = useMutation({
    mutationFn: async (nextSubjectIds: string[]) => {
      const result = await updateRoomSubjectsAction(roomId, nextSubjectIds);
      if (result.error) {
        throw new Error(result.error);
      }
      return nextSubjectIds;
    },
    onMutate: async (nextSubjectIds) => {
      setLocalSelected(nextSubjectIds);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      setLocalSelected(selectedSubjectIds);
      toast.error(error.message || "Не удалось обновить предметы кабинета");
    },
    onSuccess: () => {
      toast.success("Предметы кабинета обновлены");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const available = filteredSubjects.filter((subject) => !localSelected.includes(subject.id));
  const allowed = filteredSubjects.filter((subject) => localSelected.includes(subject.id));

  const toggleSubject = (subjectId: string) => {
    const exists = localSelected.includes(subjectId);
    const next = exists
      ? localSelected.filter((id) => id !== subjectId)
      : [...localSelected, subjectId];
    mutation.mutate(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const over = event.over?.id;
    const activeId = String(event.active.id);
    if (!over) return;

    if (over === "allowed" && !localSelected.includes(activeId)) {
      mutation.mutate([...localSelected, activeId]);
      return;
    }

    if (over === "available" && localSelected.includes(activeId)) {
      mutation.mutate(localSelected.filter((id) => id !== activeId));
    }
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Разрешенные предметы для {roomName}</h3>
        </div>
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Поиск по предметам..." />
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <SubjectBucket id="available" title="Доступные предметы">
            {available.length ? (
              available.map((subject) => (
                <SubjectPill
                  key={subject.id}
                  subject={subject}
                  inAllowed={false}
                  onToggle={() => toggleSubject(subject.id)}
                />
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Нет доступных предметов</p>
            )}
          </SubjectBucket>

          <SubjectBucket id="allowed" title="Разрешено в кабинете">
            {allowed.length ? (
              allowed.map((subject) => (
                <SubjectPill
                  key={subject.id}
                  subject={subject}
                  inAllowed={true}
                  onToggle={() => toggleSubject(subject.id)}
                />
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Пока не выбрано ни одного предмета</p>
            )}
          </SubjectBucket>
        </div>
      </DndContext>
    </div>
  );
}
