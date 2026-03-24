"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    onSubmit: async ({ value }) => {
      const result = await createBuildingAction(value);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(`Здание '${result.building.name}' успешно добавлено`);
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
              <div className="grid gap-1.5">
                <label htmlFor={field.name} className="text-sm font-medium">
                  Название
                </label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Главный корпус"
                  disabled={form.state.isSubmitting}
                />
                {field.state.meta.errors[0] ? (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                ) : null}
              </div>
            )}
          </form.Field>

          <form.Field name="address">
            {(field) => (
              <div className="grid gap-1.5">
                <label htmlFor={field.name} className="text-sm font-medium">
                  Адрес
                </label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="ул. Лесная, 10"
                  disabled={form.state.isSubmitting}
                />
                {field.state.meta.errors[0] ? (
                  <p className="text-xs text-destructive">{String(field.state.meta.errors[0])}</p>
                ) : null}
              </div>
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
