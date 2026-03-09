"use client";

import { type ColumnDef } from "@tanstack/react-table";
import type { UserWithRoles } from "../_lib/types";
import { UserCell } from "./user-cell";
import { RoleBadge, DomainRoleBadges } from "./role-badges";
import { StatusCell } from "./status-cell";
import { UserActionsMenu } from "./user-actions-menu";

export const columns: ColumnDef<UserWithRoles>[] = [
  {
    accessorKey: "user",
    header: "Пользователь",
    cell: ({ row }) => <UserCell user={row.original} />,
    size: 300,
  },
  {
    accessorKey: "role",
    header: "Системная роль",
    cell: ({ row }) => <RoleBadge role={row.original.role} />,
    size: 140,
  },
  {
    id: "domainRoles",
    header: "Роли в школе",
    cell: ({ row }) => <DomainRoleBadges user={row.original} />,
    size: 220,
  },
  {
    accessorKey: "status",
    header: "Статус",
    cell: ({ row }) => <StatusCell user={row.original} />,
    size: 200,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row, table }) => <UserActionsMenu user={row.original} table={table} />,
    size: 50,
  },
];
