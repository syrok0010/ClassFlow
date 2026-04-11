"use client";

import { useState, useCallback } from "react";
import { Copy, Search, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { copyInviteUrl } from "@/lib/invite";
import {
  generateParentInviteAction,
  linkExistingParentAction,
  searchParentsAction,
} from "../_actions/user-actions";
import { SegmentedControl } from "@/components/ui/segmented-control";

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

export function ParentInviteDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
}: ParentInviteDialogProps) {
  const [activeTab, setActiveTab] = useState<"new" | "existing">("new");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ParentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateParentInviteAction(studentId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setGeneratedCode(result.token);
      }
    } catch {
      toast.error("Ошибка при генерации инвайта");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;

    try {
      await copyInviteUrl(generatedCode);
      toast.success("Ссылка скопирована в буфер обмена");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await searchParentsAction(query);
        setSearchResults(results);
      } catch {
        toast.error("Ошибка поиска");
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const handleLink = async (parentId: string) => {
    setIsLinking(true);
    try {
      const result = await linkExistingParentAction(studentId, parentId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Родитель привязан к ученику");
        onOpenChange(false);
      }
    } catch {
      toast.error("Ошибка при привязке");
    } finally {
      setIsLinking(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setGeneratedCode(null);
      setSearchQuery("");
      setSearchResults([]);
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
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Будет сгенерирован уникальный код для активации. Передайте его родителю через мессенджер — он сам заполнит свои данные при первом входе.
                </p>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? "Генерация..." : "Сгенерировать код"}
                </Button>
              </div>
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
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {isSearching && (
                <p className="py-4 text-center text-sm text-muted-foreground">Поиск...</p>
              )}
              {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Ничего не найдено
                </p>
              )}
              {searchResults.map((parent) => {
                const fullName = [parent.user.surname, parent.user.name, parent.user.patronymicName]
                  .filter(Boolean)
                  .join(" ");
                const childrenNames = parent.studentParents
                  .map((sp) => [sp.student.user.surname, sp.student.user.name].filter(Boolean).join(" "))
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
                      onClick={() => handleLink(parent.id)}
                      disabled={isLinking}
                    >
                      <Link2 className="mr-1 h-3 w-3" />
                      Связать
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
