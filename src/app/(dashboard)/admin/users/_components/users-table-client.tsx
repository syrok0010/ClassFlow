"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { useQueryState } from "nuqs";
import { Search, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { columns } from "./columns";
import { SmartRow } from "./smart-row";
import { ParentInviteDialog } from "./parent-invite-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";
import { UserProfileSheet } from "./user-profile-sheet";
import type { UserWithRoles, UserTableMeta } from "../_lib/types";

interface UsersTableClientProps {
  users: UserWithRoles[];
  now: Date;
}

const DOMAIN_ROLE_OPTIONS = [
  { value: "all", label: "Все" },
  { value: "teacher", label: "Учителя" },
  { value: "student", label: "Ученики" },
  { value: "parent", label: "Родители" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "Все статусы" },
  { value: "ACTIVE", label: "Активные" },
  { value: "PENDING_INVITE", label: "Ожидают инвайт" },
  { value: "DISABLED", label: "Заблокированные" },
] as const;

export function UsersTableClient({ users, now }: UsersTableClientProps) {
  const [search, setSearch] = useQueryState("search", { defaultValue: "", shallow: false });
  const [domainRoleFilter, setDomainRoleFilter] = useQueryState("role", { defaultValue: "all", shallow: false });
  const [statusFilter, setStatusFilter] = useQueryState("status", { defaultValue: "all", shallow: false });
  const [inviteId, setInviteId] = useQueryState("invite_id", { shallow: false });
  const [smartRowActive, setSmartRowActive] = useState(false);
  const [modal, setModal] = useState<{
    type: "profile" | "delete";
    user: UserWithRoles;
  } | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    meta: { setModal, setInviteId, now } as UserTableMeta,
  });

  const hasActiveFilters = search || domainRoleFilter !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    void setSearch(null);
    void setDomainRoleFilter(null);
    void setStatusFilter(null);
  };

  const handleActivateSmartRow = () => setSmartRowActive(true);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Пользователи</h1>
        {!smartRowActive && (
          <div className="animate-in fade-in-0 zoom-in-90 duration-300">
            <Button onClick={handleActivateSmartRow} size="lg">
              <UserPlus className="mr-2 h-4 w-4" />
              Добавить пользователя
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-60 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени или E-mail..."
            className="pl-9"
          />
        </div>
        <SegmentedControl
          value={domainRoleFilter}
          onChange={setDomainRoleFilter}
          options={DOMAIN_ROLE_OPTIONS}
        />
        <SegmentedControl
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
        />
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} size="sm" className="text-muted-foreground">
            <X className="mr-1 h-3 w-3" />
            Сбросить
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    className={header.column.columnDef.meta?.headerClassName}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <SmartRow
              active={smartRowActive}
              onDeactivate={() => setSmartRowActive(false)}
            />
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={
                    row.original.status === "DISABLED"
                      ? "opacity-50"
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id}
                      className={cell.column.columnDef.meta?.cellClassName}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Search className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Пользователи не найдены
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="link"
                        onClick={clearFilters}
                        className="text-sm h-auto p-0"
                      >
                        Сбросить фильтры
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {inviteId && (
        <ParentInviteDialog
          open={true}
          onOpenChange={(open) => !open && setInviteId(null)}
          studentId={inviteId}
          studentName={users.find(u => u.students[0]?.id === inviteId) 
            ? [users.find(u => u.students[0]?.id === inviteId)?.surname, users.find(u => u.students[0]?.id === inviteId)?.name].filter(Boolean).join(" ")
            : "Ученик"
          }
        />
      )}

      {modal?.type === "delete" && (
        <DeleteUserDialog
          open={true}
          onOpenChange={(open) => !open && setModal(null)}
          user={modal.user}
        />
      )}

      {modal?.type === "profile" && (
        <UserProfileSheet
          open={true}
          onOpenChange={(open) => !open && setModal(null)}
          user={modal.user}
        />
      )}
    </div>
  );
}
