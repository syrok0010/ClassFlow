"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { flushSync } from "react-dom";
import { Plus, Link2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { createRoomAction } from "../_actions/room-actions";

type RoomSmartRowProps = {
  active: boolean;
  buildingId: string;
  onDeactivate: () => void;
  onCreated: (roomId: string, configureSubjects: boolean) => void;
};

export function RoomSmartRow({ active, buildingId, onDeactivate, onCreated }: RoomSmartRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const capacityRef = useRef<HTMLInputElement>(null);
  const [requestMode, setRequestMode] = useState<"save" | "configure">("save");

  const form = useForm({
    defaultValues: {
      name: "",
      seatsCount: "",
    },
    onSubmit: async ({ value }) => {
      const normalizedName = value.name.trim();
      const parsedSeats = Number(value.seatsCount);

      if (!normalizedName) {
        toast.error("Введите название кабинета");
        nameRef.current?.focus();
        return;
      }

      if (!Number.isInteger(parsedSeats) || parsedSeats < 1) {
        toast.error("Вместимость должна быть целым числом от 1");
        capacityRef.current?.focus();
        return;
      }

      const result = await createRoomAction({
        buildingId,
        name: normalizedName,
        seatsCount: parsedSeats,
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(`Кабинет '${result.room.name}' добавлен`);
      const mode = requestMode;

      flushSync(() => {
        form.reset();
      });

      requestAnimationFrame(() => {
        nameRef.current?.focus();
      });

      onCreated(result.room.id, mode === "configure");
    },
  });

  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => {
      nameRef.current?.focus();
      rowRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);

  if (!active) return null;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      const hasData = !!form.state.values.name.trim() || !!form.state.values.seatsCount.trim();
      if (!hasData) {
        onDeactivate();
      } else {
        form.reset();
      }
      return;
    }

    if (e.key === "Enter" && !e.ctrlKey) {
      e.preventDefault();
      setRequestMode("save");
      void form.handleSubmit();
    }

    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      setRequestMode("configure");
      void form.handleSubmit();
    }
  };

  return (
    <TableRow
      ref={rowRef}
      className="bg-primary/5 border-primary/30 animate-in fade-in-0 slide-in-from-top-2 zoom-in-[99%] duration-300"
    >
      <TableCell className="pl-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-primary/40 text-primary">
            <Plus className="h-4 w-4" />
          </span>
          <form.Field name="name">
            {(field) => (
              <Input
                ref={nameRef}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Кабинет 301"
                className="h-8 w-56"
                disabled={form.state.isSubmitting}
              />
            )}
          </form.Field>
        </div>
      </TableCell>

      <TableCell>
        <form.Field name="seatsCount">
          {(field) => (
            <Input
              ref={capacityRef}
              name={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="30"
              inputMode="numeric"
              className="h-8 w-24"
              disabled={form.state.isSubmitting}
            />
          )}
        </form.Field>
      </TableCell>

      <TableCell>
        <span className="text-xs text-muted-foreground">Предметы можно настроить после создания</span>
      </TableCell>

      <TableCell>
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              setRequestMode("save");
              void form.handleSubmit();
            }}
            disabled={form.state.isSubmitting}
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              setRequestMode("configure");
              void form.handleSubmit();
            }}
            disabled={form.state.isSubmitting}
          >
            <Link2 className="h-3.5 w-3.5" />
            Настроить предметы
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              const hasData = !!form.state.values.name.trim() || !!form.state.values.seatsCount.trim();
              if (hasData) {
                form.reset();
                return;
              }
              onDeactivate();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
