"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateBuildingInput, createBuildingSchema } from "@/app/(dashboard)/admin/rooms/_lib/schemas";
import { useRoomsData } from "./rooms-data-context";

type CreateBuildingDialogProps = {
  triggerVariant?: "icon" | "button";
};

export function CreateBuildingDialog({ triggerVariant = "icon" }: CreateBuildingDialogProps) {
  const { commands } = useRoomsData();
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      address: "",
    } as CreateBuildingInput,
    validators: {
      onChange: createBuildingSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await commands.createBuilding.mutateAsync(createBuildingSchema.parse(value));
        setOpen(false);
        form.reset();
      } catch {
        // Toast is shown by the mutation.
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          triggerVariant === "icon" ? (
            <Button variant="outline" size="icon" title="Добавить здание" />
          ) : (
            <Button size="lg" />
          )
        }
      >
        {triggerVariant === "icon" ? <Plus /> : <><Plus className="mr-1" />Добавить здание</>}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Добавить новое здание
          </DialogTitle>
          <DialogDescription>
            Для добавления кабинетов сначала создайте учебный корпус.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <form.Field name="name">
            {(field) => (
              <FormField
                field={field}
                label="Название"
                placeholder="Главный корпус"
                required
              />
            )}
          </form.Field>

          <form.Field name="address">
            {(field) => (
              <FormField field={field} label="Адрес" placeholder="ул. Лесная, 10" />
            )}
          </form.Field>
        </div>

        <DialogFooter>
          <form.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
            {({ canSubmit, isSubmitting }) => (
              <Button
                disabled={!canSubmit || isSubmitting || commands.createBuilding.isPending}
                onClick={() => void form.handleSubmit()}
              >
                {isSubmitting || commands.createBuilding.isPending
                  ? "Сохраняем..."
                  : "Сохранить"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
