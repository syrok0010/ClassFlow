"use client";

import { useForm } from "@tanstack/react-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "sonner";
import { updateUserAction } from "../_actions/user-actions";
import { updateUserSchema } from "../_lib/schemas";
import { FormField } from "@/components/ui/form-field";
import type { UserWithRoles } from "../_lib/types";

interface UserProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles;
}

const SYSTEM_ROLE_OPTIONS = [
  { value: "USER", label: "Пользователь" },
  { value: "ADMIN", label: "Администратор" }
] as const;

export function UserProfileSheet({ open, onOpenChange, user }: UserProfileSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <UserProfileForm 
          key={user.id} 
          user={user} 
          onClose={() => onOpenChange(false)} 
        />
      </SheetContent>
    </Sheet>
  );
}

function UserProfileForm({ user, onClose }: { user: UserWithRoles, onClose: () => void }) {
  const form = useForm({
    defaultValues: {
      id: user.id,
      surname: user.surname ?? "",
      name: user.name ?? "",
      patronymicName: user.patronymicName ?? "",
      email: user.email ?? "",
      systemRole: user.role as "ADMIN" | "USER",
      isTeacher: user.teachers.length > 0,
      isStudent: user.students.length > 0,
      isParent: user.parents.length > 0,
    },
    validators: {
      onChange: updateUserSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await updateUserAction(value);
        if ("error" in result) {
          toast.error(result.error);
        } else {
          toast.success("Профиль обновлён");
          onClose();
        }
      } catch {
        toast.error("Ошибка при сохранении");
      }
    },
  });

  return (
    <>
      <SheetHeader>
        <SheetTitle>Редактирование профиля</SheetTitle>
        <SheetDescription>
          Изменение данных пользователя и управление ролями.
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 px-4 py-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Личные данные
          </h3>
          <div className="space-y-3">
            <form.Field name="surname">
              {(field) => (
                <FormField
                  field={field}
                  label="Фамилия"
                  required
                />
              )}
            </form.Field>
            <form.Field name="name">
              {(field) => (
                <FormField
                  field={field}
                  label="Имя"
                  required
                />
              )}
            </form.Field>
            <form.Field name="patronymicName">
              {(field) => (
                <FormField
                  field={field}
                  label="Отчество"
                />
              )}
            </form.Field>
            <form.Field name="email">
              {(field) => (
                <FormField
                  field={field}
                  label="E-mail"
                  type="email"
                />
              )}
            </form.Field>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Системная роль
          </h3>
          <form.Field name="systemRole">
            {(field) => (
              <SegmentedControl
                value={field.state.value}
                onChange={(v) => field.handleChange(v as "ADMIN" | "USER")}
                options={SYSTEM_ROLE_OPTIONS}
                className="w-full flex [&>button]:flex-1"
              />
            )}
          </form.Field>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Роли в школе
          </h3>
          <p className="text-xs text-muted-foreground">
            Один пользователь может совмещать несколько ролей (например, учитель и родитель).
          </p>
          <div className="space-y-3">
            <form.Field name="isTeacher">
              {(field) => (
                <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={field.state.value}
                    onBlur={field.handleBlur}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                  />
                  <div>
                    <span className="text-sm font-medium">Учитель</span>
                    <p className="text-xs text-muted-foreground">Может вести предметы и быть привязан к расписанию</p>
                  </div>
                </label>
              )}
            </form.Field>
            <form.Field name="isStudent">
              {(field) => (
                <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={field.state.value}
                    onBlur={field.handleBlur}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                  />
                  <div>
                    <span className="text-sm font-medium">Ученик</span>
                    <p className="text-xs text-muted-foreground">Может быть записан в группы и классы</p>
                  </div>
                </label>
              )}
            </form.Field>
            <form.Field name="isParent">
              {(field) => (
                <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={field.state.value}
                    onBlur={field.handleBlur}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                  />
                  <div>
                    <span className="text-sm font-medium">Родитель</span>
                    <p className="text-xs text-muted-foreground">Получает доступ к дневникам привязанных детей</p>
                  </div>
                </label>
              )}
            </form.Field>
          </div>
        </section>

        {user.parents.length > 0 && user.parents.some(p => p.studentParents.length > 0) && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Привязанные дети
            </h3>
            <div className="space-y-2">
              {user.parents.flatMap((p) =>
                p.studentParents.map((sp) => {
                  const childName = [sp.student.user.surname, sp.student.user.name]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <div
                      key={sp.student.id}
                      className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2.5"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-600">
                        {sp.student.user.surname?.[0] ?? "?"}
                      </div>
                      <span className="text-sm">{childName || "Без имени"}</span>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {user.students.length > 0 && user.students.some(s => s.studentParents.length > 0) && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Родители
            </h3>
            <div className="space-y-2">
              {user.students.flatMap((s) =>
                s.studentParents.map((sp) => {
                  const parentName = [sp.parent.user.surname, sp.parent.user.name]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <div
                      key={sp.parent.id}
                      className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2.5"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-600">
                        {sp.parent.user.surname?.[0] ?? "?"}
                      </div>
                      <span className="text-sm">{parentName || "Без имени"}</span>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>

      <SheetFooter>
        <Button variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <form.Subscribe selector={(state) => ({ 
          canSubmit: state.canSubmit, 
          isSubmitting: state.isSubmitting, 
          isValid: state.isValid, 
          isPristine: state.isPristine 
        })}>
          {({ canSubmit, isSubmitting, isValid, isPristine }) => (
            <Button 
              onClick={(e) => {
                e.preventDefault();
                void form.handleSubmit();
              }} 
              disabled={!canSubmit || isSubmitting || !isValid || isPristine}
            >
              {isSubmitting ? "Сохранение..." : "Сохранить"}
            </Button>
          )}
        </form.Subscribe>
      </SheetFooter>
    </>
  );
}
