"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { WandSparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { generateWeeklyScheduleTemplateAction } from "../_actions/generate-schedule-action";

export function GenerateScheduleButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

  const disabled = isGenerating || isPending;

  function handleGenerate() {
    setIsGenerating(true);

    startTransition(async () => {
      const response = await generateWeeklyScheduleTemplateAction({ replaceExisting: true });
      setIsGenerating(false);

      if (response.result === null) {
        toast.error(response.error ?? "Не удалось сгенерировать расписание");
        return;
      }

      const result = response.result;
      toast.success(
        `Шаблон обновлен: ${result.insertedTemplateCount} записей, режимных ${result.regimeActivityCount}, обычных ${result.ordinaryActivityCount}`,
      );
      router.refresh();
    });
  }

  return (
    <Button type="button" onClick={handleGenerate} disabled={disabled}>
      {disabled ? <Spinner data-icon="inline-start" /> : <WandSparklesIcon data-icon="inline-start" />}
      {disabled ? "Генерация..." : "Сгенерировать"}
    </Button>
  );
}
