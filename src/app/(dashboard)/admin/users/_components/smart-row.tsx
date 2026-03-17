"use client";

import { useRef, useCallback, useEffect, useState, KeyboardEvent } from "react";
import { flushSync } from "react-dom";
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
    },
    validators: {
      onChange: createUserSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await createUserAction(value);

        if ("error" in result) {
          toast.error(result.error);
        } else {
          const fullName = `${value.surname} ${value.name}`;
          toast.success(`${fullName} добавлен`);

          flushSync(() => {
            if (result.inviteToken) {
              setLastInviteToken(result.inviteToken);
            }
            form.reset();
          });
          
          requestAnimationFrame(() => {
            surnameRef.current?.focus();
          });
        }
      } catch {
        toast.error("Ошибка при создании пользователя");
      }
    },
  });

  useEffect(() => {
    if (active) {
      const frame = requestAnimationFrame(() => {
        surnameRef.current?.focus();
        rowRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [active]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        form.reset();
        onDeactivate();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
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
              <span className="text-sm text-muted-foreground font-medium">Инвайт-код:</span>
              <span className="font-mono font-bold text-primary tracking-wider bg-primary/10 px-2 py-0.5 rounded">{lastInviteToken}</span>
              <Button size="sm" variant="outline" onClick={handleCopyLastInvite} className="h-7 text-xs font-semibold">
                <Copy className="mr-1.5 h-3 w-3" />
                Скопировать ссылку
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setLastInviteToken(null)} className="h-7 w-7 p-0">
                <X className="h-3 w-3" />
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-primary/30 text-sm text-primary/50 font-bold">
              +
            </div>
            <div className="flex gap-1.5 min-w-0">
              <form.Field name="surname">
                {(field) => (
                  <div className="relative group">
                    <Input
                      ref={surnameRef}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Фамилия"
                      className={cn(
                        "h-8 text-sm w-32 transition-all",
                        field.state.meta.errors.length ? "border-destructive ring-destructive/20 ring-2" : "group-hover:border-primary/50"
                      )}
                      disabled={form.state.isSubmitting}
                    />
                  </div>
                )}
              </form.Field>
              <form.Field name="name">
                {(field) => (
                  <div className="relative group">
                    <Input
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Имя"
                      className={cn(
                        "h-8 text-sm w-32 transition-all",
                        field.state.meta.errors.length ? "border-destructive ring-destructive/20 ring-2" : "group-hover:border-primary/50"
                      )}
                      disabled={form.state.isSubmitting}
                    />
                  </div>
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
                    placeholder="Отчество"
                    className="h-8 text-sm w-32 hover:border-primary/50 transition-all font-light"
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
                <SelectTrigger className="h-8 w-36 text-sm hover:border-primary/50 transition-all" onKeyDown={handleKeyDown}>
                  <SelectValue>
                    {DOMAIN_ROLE_LABELS[field.state.value as keyof typeof DOMAIN_ROLE_LABELS]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOMAIN_ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-sm">
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
                  "h-8 text-sm w-56 transition-all",
                  field.state.meta.errors.length ? "border-destructive ring-destructive/20 ring-2" : "hover:border-primary/50"
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
              <form.Subscribe selector={(state) => ({ 
                canSubmit: state.canSubmit, 
                isSubmitting: state.isSubmitting, 
                isValid: state.isValid 
              })}>
                {({ canSubmit, isSubmitting, isValid }) => (
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      void form.handleSubmit();
                    }}
                    disabled={!canSubmit || isSubmitting || !isValid}
                    className="font-semibold shadow-sm"
                  >
                    <Check className={cn(isSubmitting && "animate-pulse")} />
                    Сохранить
                  </Button>
                )}
              </form.Subscribe>
              <Button
                variant="ghost"
                onClick={() => { form.reset(); setLastInviteToken(null); onDeactivate(); }}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <X />
                Отмена
              </Button>
            </div>
            <span className="text-xs text-muted-foreground/60 font-medium tracking-wide pl-1">
               Enter / Esc
            </span>
          </div>
        </TableCell>
      </TableRow>
    </>
  );
}
