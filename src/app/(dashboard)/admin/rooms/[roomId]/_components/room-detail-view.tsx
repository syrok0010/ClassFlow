"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { getRoomByIdAction, updateRoomAction } from "../../_actions/room-actions";
import { RoomSubjectsTransfer } from "../../_components/room-subjects-transfer";
import { useRoomsData } from "../../_components/rooms-data-context";
import { updateRoomSchema } from "../../_lib/schemas";

type RoomDetailViewProps = {
  roomId: string;
};

export function RoomDetailView({ roomId }: RoomDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subjects } = useRoomsData();

  const queryKey = useMemo(() => ["rooms", "detail", roomId] as const, [roomId]);

  const roomQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await getRoomByIdAction(roomId);
      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.result) {
        throw new Error("Кабинет не найден");
      }

      return response.result;
    },
    staleTime: 30_000,
  });

  const room = roomQuery.data;

  const form = useForm({
    defaultValues: {
      name: room?.name ?? "",
      seatsCount: room?.seatsCount ?? 0,
    },
    validators: {
      onChange: updateRoomSchema.omit({ id: true }),
    },
    onSubmit: async ({ value }) => {
      if (!room) return;

      const result = await updateRoomAction({
        id: room.id,
        name: value.name.trim(),
        seatsCount: value.seatsCount,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Кабинет обновлен");
      await roomQuery.refetch();
      router.refresh();
    },
  });

  useEffect(() => {
    if (!room) return;
    form.setFieldValue("name", room.name);
    form.setFieldValue("seatsCount", room.seatsCount);
  }, [form, room]);

  if (roomQuery.isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">Загрузка кабинета...</p>
      </div>
    );
  }

  if (roomQuery.isError || !room) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-destructive">Не удалось загрузить кабинет.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            const query = new URLSearchParams(searchParams.toString());
            router.push(`/admin/rooms?${query.toString()}`);
          }}
        >
          Назад к таблице
        </Button>
      </div>
    );
  }

  const selectedSubjectIds = room.roomSubjects.map((item) => item.subject.id);

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
            <h1 className="text-2xl font-bold tracking-tight">{room.name}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {room.building?.name ?? "Без привязки к зданию"}
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
          roomId={room.id}
          roomName={room.name}
          allSubjects={subjects}
          selectedSubjectIds={selectedSubjectIds}
          queryKey={[...queryKey]}
        />
      </div>
    </div>
  );
}
