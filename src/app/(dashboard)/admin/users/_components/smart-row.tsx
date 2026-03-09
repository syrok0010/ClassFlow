"use client";

import { useRef, useCallback, useEffect, useState, KeyboardEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createUserAction } from "../_actions/user-actions";
import { TableCell, TableRow } from "@/components/ui/table";
import { createUserSchema } from "../_lib/schemas";
import type { z } from "zod/v4";

interface SmartRowProps {
  active: boolean;
  onDeactivate: () => void;
}

const DOMAIN_ROLE_LABELS = {
  student: "Ученик",
  teacher: "Учитель",
  admin: "Администратор",
} as const;

export function SmartRow({ active, onDeactivate }: SmartRowProps) {
  const [lastInviteToken, setLastInviteToken] = useState<string | null>(null);

  const surnameRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLTableRowElement>(null);

  const form = useForm({
    defaultValues: {
      surname: "",
      name: "",
      patronymicName: "",
      email: "",
      domainRole: "student" as "student" | "teacher" | "admin",
    } as z.input<typeof createUserSchema>,
    validators: {
      onChange: createUserSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await createUserAction({
          surname: value.surname.trim(),
          name: value.name.trim(),
          patronymicName: value.patronymicName ? value.patronymicName.trim() : "",
          email: value.email ? value.email.trim() : "",
          domainRole: value.domainRole,
        });

        if ("error" in result) {
          toast.error(result.error);
        } else {
          const fullName = `${value.surname} ${value.name}`;
          toast.success(`${fullName} добавлен`);

          if (result.inviteToken) {
            setLastInviteToken(result.inviteToken);
          }

          form.reset();
          setTimeout(() => surnameRef.current?.focus(), 50);
        }
      } catch {
        toast.error("Ошибка при создании пользователя");
      }
    },
  });

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        surnameRef.current?.focus();
        rowRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [active]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        form.reset();
        onDeactivate();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        void form.handleSubmit();
      }
    },
    [form, onDeactivate]
  );

  const handleCopyLastInvite = async () => {
    if (!lastInviteToken) return;
    const inviteUrl = `${window.location.origin}/invite/${lastInviteToken}`;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Инвайт-ссылка скопирована");
    setLastInviteToken(null);
  };

  if (!active) return null;

  return (
    <>
      {lastInviteToken && (
        <TableRow className="bg-primary/5 border-primary/20 animate-in fade-in-0 slide-in-from-top-1">
          <TableCell colSpan={5}>
            <div className="flex items-center gap-3 py-1">
              <span className="text-sm text-muted-foreground">Инвайт-код:</span>
              <span className="font-mono font-bold text-primary tracking-wider">{lastInviteToken}</span>
              <Button size="sm" variant="outline" onClick={handleCopyLastInvite} className="h-7">
                <Copy className="mr-1 h-3 w-3" />
                Скопировать
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )}

      <TableRow
        ref={rowRef}
        className="bg-primary/5 border-primary/30 animate-in fade-in-0 slide-in-from-top-2 zoom-in-[99%] duration-300"
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-primary/30 text-sm text-primary/50">
              +
            </div>
            <div className="flex gap-1.5 min-w-0">
              <form.Field name="surname">
                {(field) => (
                  <Input
                    ref={surnameRef}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Фамилия"
                    className={cn(
                      "h-8 text-sm w-32",
                      field.state.meta.errors.length && "border-destructive text-destructive"
                    )}
                    disabled={form.state.isSubmitting}
                  />
                )}
              </form.Field>
              <form.Field name="name">
                {(field) => (
                  <Input
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Имя"
                    className={cn(
                      "h-8 text-sm w-32",
                      field.state.meta.errors.length && "border-destructive text-destructive"
                    )}
                    disabled={form.state.isSubmitting}
                  />
                )}
              </form.Field>
              <form.Field name="patronymicName">
                {(field) => (
                  <Input
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Отч."
                    className="h-8 text-sm w-32"
                    disabled={form.state.isSubmitting}
                  />
                )}
              </form.Field>
            </div>
          </div>
        </TableCell>
        <TableCell />
        <TableCell>
          <form.Field name="domainRole">
            {(field) => (
              <Select
                value={field.state.value}
                onValueChange={(v) => field.handleChange(v as "student" | "teacher" | "admin")}
              >
                <SelectTrigger className="h-8 w-36 text-sm" onKeyDown={handleKeyDown}>
                  <SelectValue>
                    {DOMAIN_ROLE_LABELS[field.state.value as keyof typeof DOMAIN_ROLE_LABELS]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOMAIN_ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </form.Field>
        </TableCell>
        <TableCell>
          <form.Field name="email">
            {(field) => (
              <Input
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Email (необязательно)"
                className={cn(
                  "h-8 text-sm w-48",
                  field.state.meta.errors.length && "border-destructive text-destructive"
                )}
                disabled={form.state.isSubmitting}
                type="email"
              />
            )}
          </form.Field>
        </TableCell>
        <TableCell>
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5">
              <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting, state.isValid]}>
                {([canSubmit, isSubmitting, isValid]) => (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      void form.handleSubmit();
                    }}
                    disabled={!canSubmit || isSubmitting || !isValid}
                    className="h-7 px-2.5"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Сохранить
                  </Button>
                )}
              </form.Subscribe>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { form.reset(); onDeactivate(); }}
                className="h-7 px-2.5"
              >
                <X className="mr-1 h-3 w-3" />
                Отмена
              </Button>
            </div>
            <span className="text-[10px] text-muted-foreground">
               Enter / Esc
            </span>
          </div>
        </TableCell>
      </TableRow>
    </>
  );
}
