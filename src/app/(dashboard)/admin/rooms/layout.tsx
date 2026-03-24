import { getRoomsPageDataAction } from "./_actions/room-actions";
import { RoomsWorkspace } from "./_components/rooms-workspace";
import React from "react";

export default async function RoomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { buildings, subjects } = await getRoomsPageDataAction();

  return (
    <RoomsWorkspace buildings={buildings} subjects={subjects}>
      {children}
    </RoomsWorkspace>
  );
}
