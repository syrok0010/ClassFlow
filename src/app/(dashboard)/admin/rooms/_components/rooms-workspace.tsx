"use client";

import type { BuildingWithRooms, SubjectLite } from "../_lib/types";
import { RoomsDataProvider } from "./rooms-data-context";
import { useRoomsCrud } from "../_hooks/use-rooms-crud";
import { RoomsBuildingSidebar } from "./rooms-building-sidebar";

type RoomsWorkspaceProps = {
  buildings: BuildingWithRooms[];
  subjects: SubjectLite[];
  children: React.ReactNode;
};

export function RoomsWorkspace({ buildings, subjects, children }: RoomsWorkspaceProps) {
  const commands = useRoomsCrud();

  return (
    <RoomsDataProvider value={{buildings, subjects, commands}}>
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch h-full">
        <RoomsBuildingSidebar />
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </RoomsDataProvider>
  );
}
