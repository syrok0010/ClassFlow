"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { ArrowLeft, Building2, Save } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { RoomSubjectsTransfer } from "../../_components/room-subjects-transfer";
import { useRoomsData } from "../../_components/rooms-data-context";
import { updateRoomSchema } from "../../_lib/schemas";

type RoomDetail = Prisma.RoomGetPayload<{
  include: {
    building: {
      select: { id: true; name: true };
    };
    roomSubjects: {
      include: {
        subject: {
          select: { id: true; name: true };
        };
      };
    };
  };
}>;

type RoomDetailViewProps = {
  room: RoomDetail;
};

export function RoomDetailView({ room }: RoomDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { buildings, commands } = useRoomsData();
  const currentRoom = useMemo(
    () =>
      buildings
        .flatMap((building) =>
          building.rooms.map((item) => ({
            ...item,
            building,
          }))
        )
        .find((item) => item.id === room.id),
    [buildings, room.id]
  );
  const activeRoom = currentRoom ?? room;

  const form = useForm({
    defaultValues: {
      name: activeRoom.name,
      seatsCount: activeRoom.seatsCount,
    },
    validators: {
      onChange: updateRoomSchema.omit({ id: true }),
    },
    onSubmit: async ({ value }) => {
      const parsed = updateRoomSchema.safeParse({
        id: room.id,
        name: value.name.trim(),
        seatsCount: value.seatsCount,
      });
      if (!parsed.success) {
        return;
      }

      await commands.updateRoom.execute(parsed.data);
    },
  });

  const selectedSubjectIds = activeRoom.roomSubjects.map((item) => item.subject.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button
              variant="ghost"
              className="mb-1 -ml-2"
              onClick={() => {
                const query = new URLSearchParams(searchParams.toString());
                router.push(`/admin/rooms?${query.toString()}`);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к таблице
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">{activeRoom.name}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {activeRoom.building?.name ?? "Без привязки к зданию"}
            </p>
          </div>
        </div>

          <div className="flex items-start gap-3 pt-4">
            <form.Field name="name">
              {(field) => (
                <div className="flex-1">
                  <FormField
                    field={field}
                    label="Название"
                    placeholder="Кабинет 302"
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="seatsCount">
              {(field) => (
                <div className="w-32">
                  <FormField
                    field={field}
                    label="Вместимость"
                    placeholder="30"
                    type="number"
                  />
                </div>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  className="w-52 h-8.5 mt-4.5"
                  onClick={() => void form.handleSubmit()}
                  disabled={!canSubmit || isSubmitting}
                >
                  <Save className="h-4 w-4" />
                  {isSubmitting ? "Сохраняем..." : "Сохранить изменения"}
                </Button>
              )}
            </form.Subscribe>
          </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <RoomSubjectsTransfer
          roomId={activeRoom.id}
          roomName={activeRoom.name}
          selectedSubjectIds={selectedSubjectIds}
        />
      </div>
    </div>
  );
}
