"use client";

import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { ScheduleEditorStep, ScheduleEditorStepId } from "../_lib/schedule-editor-flow";

type ScheduleEditorStepperProps = {
  steps: ScheduleEditorStep[];
  currentStepId: ScheduleEditorStepId;
  completedStepIds: ScheduleEditorStepId[];
  accessibleStepIds: ScheduleEditorStepId[];
  onStepSelect: (stepId: ScheduleEditorStepId) => void;
};

export function ScheduleEditorStepper({
  steps,
  currentStepId,
  completedStepIds,
  accessibleStepIds,
  onStepSelect,
}: ScheduleEditorStepperProps) {
  const completed = new Set(completedStepIds);
  const accessible = new Set(accessibleStepIds);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Шаги настройки</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((step, index) => {
            const isCurrent = step.id === currentStepId;
            const isCompleted = completed.has(step.id);
            const isAccessible = accessible.has(step.id);

            return (
              <div key={step.id} className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"}
                  size="sm"
                  disabled={!isAccessible}
                  onClick={() => onStepSelect(step.id)}
                >
                  {isCompleted && !isCurrent ? <CheckIcon data-icon="inline-start" /> : null}
                  <Badge variant={isCurrent ? "secondary" : "outline"}>{index + 1}</Badge>
                  <span className={cn("truncate", !isAccessible && "text-muted-foreground")}>{step.title}</span>
                </Button>
                {index < steps.length - 1 ? <Separator orientation="vertical" className="h-6" /> : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
