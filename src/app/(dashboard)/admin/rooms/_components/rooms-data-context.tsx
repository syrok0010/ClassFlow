"use client";

import { createContext, useContext } from "react";
import type { BuildingWithRooms, SubjectLite } from "../_lib/types";

type RoomsData = {
  buildings: BuildingWithRooms[];
  subjects: SubjectLite[];
};

const RoomsDataContext = createContext<RoomsData | null>(null);

export function RoomsDataProvider({
  value,
  children,
}: {
  value: RoomsData;
  children: React.ReactNode;
}) {
  return <RoomsDataContext.Provider value={value}>{children}</RoomsDataContext.Provider>;
}

export function useRoomsData() {
  const context = useContext(RoomsDataContext);
  if (!context) {
    throw new Error("useRoomsData must be used inside RoomsDataProvider");
  }
  return context;
}
