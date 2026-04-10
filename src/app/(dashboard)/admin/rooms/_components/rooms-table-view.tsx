"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryState } from "nuqs";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { Building2, DoorOpen, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RoomListItem } from "../_lib/types";
import { useRoomsData } from "./rooms-data-context";
import { roomsColumns } from "./rooms-table-columns";
import { RoomSmartRow } from "./room-smart-row";
import { CreateBuildingDialog } from "./create-building-dialog";

const ALL_BUILDINGS = "all";

export function RoomsTableView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { buildings } = useRoomsData();

  const [search, setSearch] = useQueryState("search", { defaultValue: "", shallow: false });
  const [capacityFilter, setCapacityFilter] = useQueryState("capacity", { defaultValue: "", shallow: false });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [smartRowActive, setSmartRowActive] = useState(false);

  const buildingFilter = searchParams.get("building") ?? ALL_BUILDINGS;

  const scopedRoomRows = useMemo<RoomListItem[]>(() => {
    const sourceBuildings =
      buildingFilter === ALL_BUILDINGS
        ? buildings
        : buildings.filter((building) => building.id === buildingFilter);

    return sourceBuildings.flatMap((building) =>
      building.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        seatsCount: room.seatsCount,
        buildingId: room.buildingId,
        buildingName: building.name,
        subjects: room.roomSubjects.map((item) => ({
          id: item.subject.id,
          name: item.subject.name,
        })),
      })),
    );
  }, [buildingFilter, buildings]);

  const roomRows = useMemo<RoomListItem[]>(() => {
    const list = scopedRoomRows;

    const needle = search.trim().toLowerCase();
    const minSeats = Number(capacityFilter);

    return list.filter((room) => {
      const searchOk = !needle || room.name.toLowerCase().includes(needle);
      const seatsOk = !capacityFilter || (Number.isFinite(minSeats) && room.seatsCount >= minSeats);
      return searchOk && seatsOk;
    });
  }, [capacityFilter, scopedRoomRows, search]);

  const selectedBuilding = buildings.find((item) => item.id === buildingFilter);
  const title =
    buildingFilter === ALL_BUILDINGS
      ? `Все здания: ${roomRows.length} кабинетов`
      : `${selectedBuilding?.name ?? "Здание"}: ${roomRows.length} кабинетов`;

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: roomRows,
    columns: roomsColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    meta: {
      onEdit: (roomId: string) => {
        const query = new URLSearchParams(searchParams.toString());
        router.push(`/admin/rooms/${roomId}?${query.toString()}`);
      },
      onDelete: () => {
        router.refresh();
      },
    },
  });

  if (!buildings.length) {
    return (
      <div className="flex min-h-full items-center justify-center rounded-xl border bg-card p-8">
        <Empty className="max-w-xl rounded-xl">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-16 bg-primary/10 text-primary">
              <Building2 className="size-8" />
            </EmptyMedia>
            <EmptyTitle className="text-2xl font-bold">Создайте первое здание</EmptyTitle>
            <EmptyDescription>
              Для добавления кабинетов необходимо сначала добавить хотя бы один учебный корпус.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateBuildingDialog triggerVariant="button" />
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const canCreateRoom = buildingFilter !== ALL_BUILDINGS && !!selectedBuilding;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">Управление кабинетами и допустимыми предметами.</p>
        </div>

        {!smartRowActive && (
          canCreateRoom ? (
            <Button size="lg" onClick={() => setSmartRowActive(true)}>
              + Добавить кабинет
            </Button>
          ) : (
            <p className="rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Чтобы создать кабинет, выберите конкретное здание в левом меню.
            </p>
          )
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск кабинета..."
            className="pl-9"
          />
        </div>

        <div className="relative w-44">
          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={capacityFilter}
            onChange={(e) => setCapacityFilter(e.target.value)}
            placeholder=">= мест"
            className="pl-9"
            inputMode="numeric"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={header.column.columnDef.meta?.headerClassName}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {smartRowActive && canCreateRoom ? (
              <RoomSmartRow
                key={`${buildingFilter}:${smartRowActive ? "open" : "closed"}`}
                buildingId={selectedBuilding.id}
                onDeactivate={() => setSmartRowActive(false)}
                onCreated={(roomId, configureSubjects) => {
                  if (configureSubjects) {
                    const query = new URLSearchParams(searchParams.toString());
                    router.push(`/admin/rooms/${roomId}?${query.toString()}`);
                    return;
                  }
                  router.refresh();
                }}
              />
            ) : null}

            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("button") || target.closest("[role='menuitem']")) {
                      return;
                    }
                    const query = new URLSearchParams(searchParams.toString());
                    router.push(`/admin/rooms/${row.original.id}?${query.toString()}`);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-56">
                  <FilterableEmptyState
                    hasFilters={Boolean(search) || Boolean(capacityFilter)}
                    empty={{
                      icon: <DoorOpen className="size-5" />,
                      title:
                        buildingFilter === ALL_BUILDINGS
                          ? "Кабинеты пока не созданы"
                          : "В этом здании пока нет кабинетов",
                      description:
                        buildingFilter === ALL_BUILDINGS
                          ? "Выберите здание слева или создайте кабинеты внутри конкретного корпуса."
                          : "Добавьте первый кабинет, чтобы назначать предметы и заполнять расписание.",
                      action:
                        buildingFilter !== ALL_BUILDINGS ? (
                          <Button size="sm" onClick={() => setSmartRowActive(true)}>
                            + Добавить первый кабинет
                          </Button>
                        ) : null,
                    }}
                    onResetFilters={() => {
                      void setSearch(null);
                      void setCapacityFilter(null);
                    }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
