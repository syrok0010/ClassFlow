"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, Building, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateBuildingDialog } from "./create-building-dialog";
import { useRoomsData } from "./rooms-data-context";

const ALL_BUILDINGS = "all";
const BUILDING_ROOMS_PATH = "/admin/rooms";

export function RoomsBuildingSidebar() {
  const searchParams = useSearchParams();
  const { buildings } = useRoomsData();

  const selectedBuilding = searchParams.get("building") ?? ALL_BUILDINGS;

  const queryFor = (buildingId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (buildingId === ALL_BUILDINGS) {
      params.delete("building");
    } else {
      params.set("building", buildingId);
    }
    return params.toString();
  };

  const selectedClass = "bg-primary text-primary-foreground";
  const unselectedClass = "hover:bg-muted text-foreground";

  return (
    <aside className="w-full md:w-77.5 shrink-0 rounded-xl border bg-card text-card-foreground shadow-sm h-full">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">Здания</h2>
        <CreateBuildingDialog triggerVariant="icon" />
      </div>

      <nav className="flex flex-col gap-1 p-2">
        <Link
          href={`${BUILDING_ROOMS_PATH}?${queryFor(ALL_BUILDINGS)}`}
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
            selectedBuilding === ALL_BUILDINGS ? selectedClass : unselectedClass,
          )}
        >
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Все здания
          </span>
          <span className={cn("text-xs", selectedBuilding === ALL_BUILDINGS ? "text-primary-foreground/80" : "text-muted-foreground")}>
            {buildings.reduce((acc, building) => acc + building.rooms.length, 0)}
          </span>
        </Link>

        {buildings.map((building) => {
          const active = selectedBuilding === building.id;

          return (
            <Link
              key={building.id}
              href={`${BUILDING_ROOMS_PATH}?${queryFor(building.id)}`}
              className={cn(
                "rounded-lg px-3 py-2 transition-colors",
                active ? selectedClass : unselectedClass,
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-medium">
                    <Building className="h-4 w-4 shrink-0" />
                    <span className="truncate">{building.name}</span>
                  </p>
                  {building.address ? (
                    <p className={cn("mt-1 line-clamp-2 text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {building.address}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 pt-0.5">
                  <span className={cn("text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {building.rooms.length}
                  </span>
                  <ChevronRight className={cn("h-3.5 w-3.5", active ? "text-primary-foreground/80" : "text-muted-foreground")} />
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
