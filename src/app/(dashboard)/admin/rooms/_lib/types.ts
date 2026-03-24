import { Prisma } from "@/generated/prisma/client";
import type { RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
  }
}

export const roomsPageInclude = {
  rooms: {
    include: {
      roomSubjects: {
        include: {
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  },
} satisfies Prisma.BuildingInclude;

export type BuildingWithRooms = Prisma.BuildingGetPayload<{ include: typeof roomsPageInclude }>;

export type SubjectLite = {
  id: string;
  name: string;
};

export type RoomListItem = {
  id: string;
  name: string;
  seatsCount: number;
  buildingId: string | null;
  buildingName: string;
  subjects: SubjectLite[];
};
