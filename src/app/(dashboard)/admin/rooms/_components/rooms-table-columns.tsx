"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RoomListItem } from "../_lib/types";
import { RoomActionsMenu } from "./room-actions-menu";

type RoomsTableMeta = {
  onEdit: (roomId: string) => void;
  onDelete: (roomId: string) => void;
};

export const roomsColumns: ColumnDef<RoomListItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 -ml-2"
      >
        Название
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
    meta: {
      headerClassName: "pl-5 w-[35%]",
      cellClassName: "pl-5 w-[35%]",
    },
  },
  {
    accessorKey: "seatsCount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 -ml-2"
      >
        Вместимость
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <span>{row.original.seatsCount}</span>,
    meta: {
      headerClassName: "w-[15%]",
      cellClassName: "w-[15%]",
    },
  },
  {
    id: "subjects",
    header: "Предметы",
    cell: ({ row }) => {
      if (!row.original.subjects.length) {
        return <span className="text-xs text-muted-foreground">Не указаны</span>;
      }

      return (
        <div className="flex flex-wrap gap-1">
          {row.original.subjects.map((subject) => (
            <span
              key={subject.id}
              className="rounded-md border bg-muted px-2 py-0.5 text-xs font-medium"
            >
              {subject.name}
            </span>
          ))}
        </div>
      );
    },
    meta: {
      headerClassName: "w-[40%]",
      cellClassName: "w-[40%]",
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row, table }) => {
      const meta = table.options.meta as RoomsTableMeta;
      return (
        <RoomActionsMenu
          room={row.original}
          onEdit={() => meta.onEdit(row.original.id)}
          onDelete={() => meta.onDelete(row.original.id)}
        />
      );
    },
    meta: {
      headerClassName: "pr-4 w-[10%]",
      cellClassName: "pr-4 w-[10%] text-right",
    },
  },
];
