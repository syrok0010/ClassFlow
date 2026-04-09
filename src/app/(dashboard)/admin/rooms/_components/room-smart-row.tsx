import { useRef, useState, type KeyboardEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { flushSync } from "react-dom";
import { Plus, Link2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { TableCell, TableRow } from "@/components/ui/table";
import { createRoomAction } from "../_actions/room-actions";
import { createRoomSchema } from "../_lib/schemas";

type RoomSmartRowProps = {
  buildingId: string;
  onDeactivate: () => void;
  onCreated: (roomId: string, configureSubjects: boolean) => void;
};

export function RoomSmartRow({ buildingId, onDeactivate, onCreated }: RoomSmartRowProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const roomFormSchema = createRoomSchema.omit({ buildingId: true });

  const form = useForm({
    defaultValues: {
      name: "",
      seatsCount: 0,
    },
    validators: {
      onChange: roomFormSchema,
    },
  });

  const submitCreateRoom = async (configureSubjects: boolean) => {
    const parsed = roomFormSchema.safeParse(form.state.values);
    if (!parsed.success || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createRoomAction({
        buildingId,
        name: parsed.data.name.trim(),
        seatsCount: parsed.data.seatsCount,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (!result.result) {
        toast.error("Не удалось создать кабинет");
        return;
      }

      toast.success(`Кабинет '${result.result.name}' добавлен`);

      // Use flushSync to ensure form is reset before we attempt to focus
      flushSync(() => form.reset());

      if (configureSubjects) {
        onCreated(result.result.id, true);
        return;
      }

      requestAnimationFrame(() => {
        nameRef.current?.focus();
      });

      onCreated(result.result.id, false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const isValid = roomFormSchema.safeParse(form.state.values).success;

    if (e.key === "Escape") {
      onDeactivate();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (!isValid) return;
      void submitCreateRoom(e.ctrlKey);
    }
  };

  return (
    <TableRow
      className="bg-primary/5 border-primary/30 animate-in fade-in-0 slide-in-from-top-2 zoom-in-[99%] duration-300"
    >
      <TableCell className="pl-5 align-top py-4">
        <div className="flex gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-primary/40 text-primary">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </span>
          <form.Field name="name">
            {(field) => (
              <div className="w-56">
                <FormField
                  field={field}
                  inputRef={nameRef}
                  placeholder="Кабинет 301"
                  inputProps={{
                    onKeyDown: handleKeyDown
                  }}
                  compact
                  truncateError
                />
              </div>
            )}
          </form.Field>
        </div>
      </TableCell>

      <TableCell className="align-top py-4">
        <form.Field name="seatsCount">
          {(field) => (
            <div className="w-24">
              <FormField
                field={field}
                type="number"
                placeholder="30"
                inputProps={{
                  onKeyDown: handleKeyDown
                }}
                compact
              />
            </div>
          )}
        </form.Field>
      </TableCell>

      <TableCell className="align-top pt-6 pb-4">
        <span className="text-[11px] text-muted-foreground leading-tight block max-w-50">
          Предметы можно настроить после создания
        </span>
      </TableCell>

      <TableCell className="align-top py-4">
        <div className="flex items-center justify-end gap-2">
          <form.Subscribe selector={(state) => ({ values: state.values })}>
            {({ values }) => {
              const canSubmit = roomFormSchema.safeParse(values).success;

              return (
              <>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!canSubmit) return;
                    void submitCreateRoom(false);
                  }}
                  disabled={!canSubmit || isSubmitting}
                  className="h-8"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Добавить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    if (!canSubmit) return;
                    void submitCreateRoom(true);
                  }}
                  disabled={!canSubmit || isSubmitting}
                  className="h-8"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Настроить предметы
                </Button>
              </>
              );
            }}
          </form.Subscribe>
          <Button
            size="icon-sm"
            variant="ghost"
            className="h-8 w-8"
            onClick={onDeactivate}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
