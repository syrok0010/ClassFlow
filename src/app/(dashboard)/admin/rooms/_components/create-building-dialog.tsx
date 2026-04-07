"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBuildingAction } from "../_actions/room-actions";
import { createBuildingSchema } from "../_lib/schemas";

const createBuildingFormSchema = createBuildingSchema.extend({
  address: z.string().trim().max(100, "Максимум 100 символов"),
});

type CreateBuildingDialogProps = {
  triggerVariant?: "icon" | "button";
};

export function CreateBuildingDialog({ triggerVariant = "icon" }: CreateBuildingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      address: "",
    },
    validators: {
      onChange: createBuildingFormSchema,
    },
    onSubmit: async ({ value }) => {
      const result = await createBuildingAction(value);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (!result.result) {
        toast.error("Не удалось создать здание");
        return;
      }

      toast.success(`Здание '${result.result.name}' успешно добавлено`);
      setOpen(false);
      form.reset();
      router.refresh();
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
              <Button disabled={!canSubmit || isSubmitting} onClick={() => void form.handleSubmit()}>
                {isSubmitting ? "Сохраняем..." : "Сохранить"}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
