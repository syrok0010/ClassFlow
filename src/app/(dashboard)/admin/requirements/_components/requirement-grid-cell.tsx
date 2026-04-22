"use client";

import React from "react";
import { Clock3, Coffee, Plus } from "lucide-react";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { 
  RequirementCellFormInput, 
  RequirementEntry, 
  RequirementGroupNode, 
  RequirementSubject,
  NavigationDirection
} from "../_lib/types";
import { QUICK_INPUT_DEFAULT_BREAK, QUICK_INPUT_DEFAULT_DURATION } from "../_lib/constants";
import { RequirementCellEditor } from "./requirement-cell-editor";

const SUBJECT_TYPE_CELL_TINT: Record<RequirementSubject["type"], string> = {
  ACADEMIC: "bg-blue-50",
  ELECTIVE_REQUIRED: "bg-orange-50",
  ELECTIVE_OPTIONAL: "bg-amber-50",
  REGIME: "bg-emerald-50",
};

type RequirementGridCellProps = {
  row: RequirementGroupNode;
  subject: RequirementSubject;
  entry: RequirementEntry | null;
  isActive: boolean;
  editing: { initialLessons?: number; instanceId: string } | null;
  quickInputMode: boolean;
  onActivate: () => void;
  onStartEditing: (lessons?: number) => void;
  onSave: (payload: RequirementCellFormInput & { advance: NavigationDirection }) => Promise<void>;
  onNavigate: (direction: NavigationDirection) => void;
};

export function RequirementGridCell({
  row,
  subject,
  entry,
  isActive,
  editing,
  quickInputMode,
  onActivate,
  onStartEditing,
  onSave,
  onNavigate,
}: RequirementGridCellProps) {
  const key = `${row.id}:${subject.id}`;

  return (
    <TableCell
      className={cn(
        "relative h-16 min-w-32 border-r border-b px-2 py-1",
        SUBJECT_TYPE_CELL_TINT[subject.type],
        !entry && "bg-muted/25",
        isActive && "ring-2 ring-primary/60 ring-inset"
      )}
    >
      <button
        type="button"
        className="group flex h-full w-full items-center justify-center text-center outline-none hover:bg-background/70 focus-visible:ring-ring"
        title="Нажмите Enter или цифру для редактирования"
        onClick={onActivate}
        onDoubleClick={() => {
          onActivate();
          onStartEditing();
        }}
        onKeyDown={(event) => {
          if (!isActive) return;

          const navMap: Record<string, NavigationDirection> = {
            ArrowUp: "up",
            ArrowDown: "down",
            ArrowLeft: "left",
            ArrowRight: "right",
          };

          if (navMap[event.key]) {
            event.preventDefault();
            onNavigate(navMap[event.key]);
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            onStartEditing();
            return;
          }

          if (/^[0-9]$/.test(event.key)) {
            event.preventDefault();
            if (quickInputMode) {
              void onSave({
                lessonsPerWeek: Number(event.key),
                durationInMinutes: entry?.durationInMinutes ?? QUICK_INPUT_DEFAULT_DURATION,
                breakDuration: entry?.breakDuration ?? QUICK_INPUT_DEFAULT_BREAK,
                advance: "stay",
              });
            } else {
              onStartEditing(Number(event.key));
            }
          }
        }}
        tabIndex={isActive ? 0 : -1}
        data-cell-focus-id={key}
      >
        {entry ? (
          <div className="flex flex-col items-center">
            <span className="text-xl font-semibold leading-none">{entry.lessonsPerWeek}</span>
            <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-0.5" title="Длительность урока">
                <Clock3 className="size-3" />
                {entry.durationInMinutes}м
              </span>
              <span className="inline-flex items-center gap-0.5" title="Длительность перемены">
                <Coffee className="size-3" />
                {entry.breakDuration}м
              </span>
            </span>
          </div>
        ) : (
          <span className="opacity-0 text-muted-foreground transition-opacity group-hover:opacity-60">
            <Plus className="size-4" />
          </span>
        )}
      </button>

      {editing && (
        <RequirementCellEditor
          key={editing.instanceId}
          quickInputMode={quickInputMode}
          initial={entry}
          initialLessons={editing.initialLessons}
          onCancel={onActivate}
          onSave={onSave}
        />
      )}
    </TableCell>
  );
}