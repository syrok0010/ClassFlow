"use client";

import { useState, useCallback } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Copy, Search, Link2, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
import { Input } from "@/components/ui/input";
import { useLatestAsyncDebouncer } from "@/hooks/use-latest-async-debouncer";
import { getUserFullName } from "@/lib/auth-access";
import { toast } from "sonner";
import { copyInviteUrl } from "@/lib/invite";
import {
  generateParentInviteAction,
  linkExistingParentAction,
  searchParentsAction,
} from "../_actions/user-actions";
import { generateParentInviteSchema } from "../_lib/schemas";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Spinner } from "@/components/ui/spinner";

type ParentSearchResult = Awaited<ReturnType<typeof searchParentsAction>>[number];

interface ParentInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

const TAB_OPTIONS = [
  { value: "new", label: "Новый родитель" },
  { value: "existing", label: "Существующий родитель" }
] as const;

function getFormErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Некорректный email";
}

export function ParentInviteDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
}: ParentInviteDialogProps) {
  const [activeTab, setActiveTab] = useState<"new" | "existing">("new");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ParentSearchResult[]>([]);

  const generateMutation = useMutation({
    mutationFn: async (value: { email: string; sendInviteEmail: boolean }) => {
      const result = await generateParentInviteAction({
        studentId,
        email: value.sendInviteEmail ? value.email.trim() : "",
        sendInviteEmail: value.sendInviteEmail,
      });
      if (result.error) {
        throw new Error(result.error);
      }
      return result.result;
    },
    onSuccess: (result) => {
      setGeneratedCode(result!.token);
      if (result!.emailDelivery.status === "sent") {
        toast.success(`Приглашение отправлено на ${result!.emailDelivery.recipient}`);
      } else if (result!.emailDelivery.status === "failed") {
        toast.error(`Родитель создан, но письмо не отправлено: ${result!.emailDelivery.error}`);
      }
    },
    onError: (error) => toast.error(error.message || "Ошибка при генерации инвайта"),
  });

  const form = useForm({
    defaultValues: {
      studentId,
      email: "",
      sendInviteEmail: false,
    },
    validators: {
      onChange: generateParentInviteSchema,
    },
    onSubmit: async ({ value }) => {
      await generateMutation.mutateAsync(value);
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (parentId: string) => {
      const result = await linkExistingParentAction(studentId, parentId);
      if ("error" in result) {
        throw new Error(result.error);
      }
    },
    onSuccess: () => {
      toast.success("Родитель привязан к ученику");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Ошибка при привязке");
    },
  });

  const handleCopyCode = async () => {
    if (!generatedCode) return;

    try {
      await copyInviteUrl(generatedCode);
      toast.success("Ссылка скопирована в буфер обмена");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const parentSearch = useLatestAsyncDebouncer(
    searchParentsAction,
    {
      wait: 350,
      onSuccess: (results) => setSearchResults(results),
      onError: () => toast.error("Ошибка поиска"),
    },
  );

  const handleSearch = useCallback((query: string) => {
      setSearchQuery(query);

      if (query.length < 2) {
        parentSearch.cancel();
        setSearchResults([]);
        return;
      }

      parentSearch.execute(query);
    },
    [parentSearch]
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setGeneratedCode(null);
      form.reset();
      setSearchQuery("");
      setSearchResults([]);
      parentSearch.cancel();
      setActiveTab("new");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Инвайт для родителя</DialogTitle>
          <DialogDescription>
            Ученик: <span className="font-medium text-foreground">{studentName}</span>
          </DialogDescription>
        </DialogHeader>

        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          options={TAB_OPTIONS}
          className="w-full flex [&>button]:flex-1"
        />

        {activeTab === "new" ? (
          <div className="space-y-4">
            {generatedCode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 py-6">
                  <span className="font-mono text-2xl font-bold tracking-wider text-primary">
                    {generatedCode}
                  </span>
                </div>
                <Button onClick={handleCopyCode} className="w-full" size="lg">
                  <Copy className="mr-2 h-4 w-4" />
                  Скопировать и отправить в мессенджер
                </Button>
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  form.setFieldValue("sendInviteEmail", true);
                  void form.handleSubmit();
                }}
              >
                <p className="text-sm text-muted-foreground">
                  Будет сгенерирован уникальный код для активации. Передайте его родителю через мессенджер - он сам заполнит свои данные при первом входе.
                </p>
                <form.Field name="email">
                  {(field) => (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium" htmlFor="parent-invite-email">
                        Email родителя
                      </label>
                      <Input
                        id="parent-invite-email"
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder="parent@example.com"
                        type="email"
                        disabled={generateMutation.isPending}
                      />
                      {field.state.meta.errors.length ? (
                        <p className="text-xs text-destructive">
                          {getFormErrorMessage(field.state.meta.errors[0])}
                        </p>
                      ) : null}
                    </div>
                  )}
                </form.Field>
                <form.Subscribe
                  selector={(state) => ({
                    email: state.values.email,
                    canSubmit: state.canSubmit,
                    isSubmitting: state.isSubmitting,
                    isValid: state.isValid,
                  })}
                >
                  {({ email, canSubmit, isSubmitting, isValid }) => (
                    <Button
                      type="button"
                      onClick={() => {
                        form.setFieldValue("sendInviteEmail", true);
                        void form.handleSubmit();
                      }}
                      disabled={
                        !email.trim() ||
                        !canSubmit ||
                        !isValid ||
                        isSubmitting
                      }
                      className="w-full"
                      size="lg"
                      variant="outline"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Отправить приглашение на почту
                    </Button>
                  )}
                </form.Subscribe>
                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button
                      type="button"
                      onClick={() => {
                        form.setFieldValue("sendInviteEmail", false);
                        void form.handleSubmit();
                      }}
                      disabled={isSubmitting}
                      className="w-full"
                      size="lg"
                    >
                      {isSubmitting
                        ? "Генерация..."
                        : "Или сгенерировать код для ручной отправки"}
                    </Button>
                  )}
                </form.Subscribe>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Начните вводить ФИО родителя..."
                className="pl-9"
              />
            </div>
            <div className="h-48 space-y-1 overflow-y-auto">
              {(!searchQuery || parentSearch.isRunning) && (
                <div className="h-full w-full flex items-center justify-center gap-4">
                  {parentSearch.isRunning ? (
                    <>
                      <Spinner/>
                      <p className="text-sm text-muted-foreground">Поиск...</p>
                    </>
                  ) : (
                    <>
                      Начните искать родителей в поле выше...
                    </>
                  )}
                </div>
              )}
              {!parentSearch.isRunning && searchQuery.length >= 2 && searchResults.length === 0 && (
                <FilterableEmptyState
                  hasFilters
                  empty={{
                    title: "Родители пока не найдены",
                    description: "Начните вводить ФИО родителя.",
                  }}
                />
              )}
              {searchResults && searchResults.map((parent) => {
                const fullName = getUserFullName(parent.user);
                const childrenNames = parent.studentParents
                  .map((sp) => getUserFullName(sp.student.user))
                  .join(", ");

                return (
                  <div
                    key={parent.id}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{fullName}</span>
                      {childrenNames && (
                        <span className="text-xs text-muted-foreground truncate">
                          Дети: {childrenNames}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void linkMutation.mutateAsync(parent.id)}
                      disabled={linkMutation.isPending}
                    >
                      <Link2 className="mr-1 h-3 w-3" />
                      {linkMutation.isPending ? "Связывание..." : "Связать"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
