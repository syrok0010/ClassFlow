"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserWithRoles } from "../_lib/types";
import { UserCell } from "./user-cell";
import { RoleBadge, DomainRoleBadges } from "./role-badges";
import { StatusCell } from "./status-cell";
import { UserActionsMenu } from "./user-actions-menu";

export const columns: ColumnDef<UserWithRoles>[] = [
  {
    id: "user",
    accessorFn: (row) => `${row.surname || ""} ${row.name || ""} ${row.patronymicName || ""}`.trim(),
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 -ml-2 data-[state=open]:bg-accent"
        >
          Пользователь
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <UserCell user={row.original} />,
    meta: {
      headerClassName: "pl-6 w-[35%]",
      cellClassName: "pl-6 w-[35%]",
    },
  },
  {
    accessorKey: "role",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 -ml-2 data-[state=open]:bg-accent"
        >
          Системная роль
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <RoleBadge role={row.original.role} />,
    meta: {
      headerClassName: "w-[15%]",
      cellClassName: "w-[15%]",
    },
  },
  {
    id: "domainRoles",
    header: "Роли в школе",
    cell: ({ row }) => <DomainRoleBadges user={row.original} />,
    meta: {
      headerClassName: "w-[25%]",
      cellClassName: "w-[25%]",
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 -ml-2 data-[state=open]:bg-accent"
        >
          Статус
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <StatusCell user={row.original} />,
    meta: {
      headerClassName: "w-[20%]",
      cellClassName: "w-[20%]",
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row, table }) => <UserActionsMenu user={row.original} table={table} />,
    meta: {
      headerClassName: "pr-6 w-[5%] whitespace-nowrap",
      cellClassName: "pr-6 w-[5%] whitespace-nowrap text-right",
    },
  },
];
