import { prisma } from "@/lib/prisma";

export async function getRoomSubjectIds(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      roomSubjects: {
        select: {
          subjectId: true,
        },
      },
    },
  });

  if (!room) {
    return null;
  }

  return room.roomSubjects.map((item) => item.subjectId);
}
