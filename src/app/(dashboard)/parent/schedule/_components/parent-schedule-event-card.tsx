"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { StudentScheduleEventCard } from "@/features/schedule/student/student-schedule-event-card";
import type { StudentScheduleEvent } from "@/features/schedule/student/student-schedule-types";
import { enrollChildInElectiveAction } from "../_actions/parent-schedule-actions";

interface ParentScheduleEventCardProps {
  event: StudentScheduleEvent;
  studentId: string;
  studentName: string;
  isOptimisticallyEnrolled: boolean;
  onEnrollmentSuccess: (groupId: string) => void;
}

export function ParentScheduleEventCard({
  event,
  studentId,
  studentName,
  isOptimisticallyEnrolled,
  onEnrollmentSuccess,
}: ParentScheduleEventCardProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isOptionalElective =
    event.subjectType === "ELECTIVE_OPTIONAL" && event.deliveryGroupId !== null;
  const isEnrolled = event.isEnrolledInDeliveryGroup || isOptimisticallyEnrolled;

  return (
    <>
      <div className="relative h-full w-full">
        <StudentScheduleEventCard event={event} />

        {isOptionalElective ? (
          <div className="pointer-events-none absolute top-1 right-1 z-10">
            {isEnrolled ? (
              <span className="pointer-events-auto inline-flex items-center gap-1 rounded-md border bg-background/90 px-1.5 py-0.5 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-[1px]">
                <Check className="size-3 text-emerald-600" />
                Посещает
              </span>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="pointer-events-auto h-6 px-2 text-[11px] shadow-sm transition-colors hover:bg-foreground hover:text-background"
                onClick={(eventClick) => {
                  eventClick.preventDefault();
                  eventClick.stopPropagation();
                  setConfirmOpen(true);
                }}
              >
                Записаться
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Записаться на доп?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-1">
              <span className="block">
                {studentName} будет записан(а) на доп «{event.subjectName}».
              </span>
              <span className="block">
                Время: {format(event.start, "EEEE", { locale: ru })}, {event.timeLabel}
              </span>
              <span className="block">Кабинет: {event.roomName}</span>
              <span className="block">Преподаватель: {event.teacherName}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(dialogEvent) => {
                dialogEvent.preventDefault();

                startTransition(async () => {
                  const result = await enrollChildInElectiveAction(studentId, event.id);

                  if (result.error) {
                    toast.error(result.error);
                    return;
                  }

                  if (!result.result) {
                    toast.error("Не удалось записать ребенка на доп");
                    return;
                  }

                  onEnrollmentSuccess(result.result.groupId);
                  setConfirmOpen(false);
                  toast.success("Ребенок записан на доп");
                  router.refresh();
                });
              }}
            >
              <span className={cn("inline-flex items-center gap-1", isPending && "opacity-90")}>
                {isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                Подтвердить
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
