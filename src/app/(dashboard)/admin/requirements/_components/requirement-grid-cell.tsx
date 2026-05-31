"use client";

import React from "react";
import { Clock3, Coffee, Lock, Plus } from "lucide-react";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { 
  RequirementCellFormInput, 
  RequirementEntry, 
  RequirementGroupNode, 
  RequirementSubject,
  NavigationDirection,
  QuickInputDurations,
} from "../_lib/types";
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
  quickInputDurations: QuickInputDurations;
  disabled?: boolean;
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
  quickInputDurations,
  disabled = false,
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
        disabled && "bg-muted/40",
        isActive && "ring-2 ring-primary/60 ring-inset"
      )}
    >
      <button
        type="button"
        className={cn(
          "group flex h-full w-full items-center justify-center text-center outline-none focus-visible:ring-ring",
          !disabled && "hover:bg-background/70",
          disabled && "cursor-not-allowed text-muted-foreground"
        )}
        title={
          disabled
            ? "Для кружка можно задавать часы только по привязанному допу"
            : "Нажмите Enter или цифру для редактирования"
        }
        onClick={disabled ? undefined : onActivate}
        onDoubleClick={() => {
          if (disabled) return;
          onActivate();
          onStartEditing();
        }}
        onKeyDown={(event) => {
          if (!isActive || disabled) return;

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
                durationInMinutes: quickInputDurations.durationInMinutes,
                breakDuration: quickInputDurations.breakDuration,
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
        {disabled ? (
          <span className="opacity-60">
            <Lock className="size-4" />
          </span>
        ) : entry ? (
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

      {editing && !disabled && (
        <RequirementCellEditor
          key={editing.instanceId}
          quickInputMode={quickInputMode}
          quickInputDurations={quickInputDurations}
          initial={entry}
          initialLessons={editing.initialLessons}
          onCancel={onActivate}
          onSave={onSave}
        />
      )}
    </TableCell>
  );
}