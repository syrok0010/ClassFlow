"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
import { assertActionSuccess } from "@/lib/mutation-utils";
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
  const enrollMutation = useMutation({
    mutationFn: async () => {
      const result = await enrollChildInElectiveAction(studentId, event.id);
      return assertActionSuccess(result, "Не удалось записать ребенка на доп");
    },
    onSuccess: (result) => {
      onEnrollmentSuccess(result.groupId);
      setConfirmOpen(false);
      toast.success("Ребенок записан на доп");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Не удалось записать ребенка на доп");
    },
  });

  const isOptionalElective =
    event.subjectType === "ELECTIVE_OPTIONAL" && event.deliveryGroupId !== null;
  const isEnrolled = event.isEnrolledInDeliveryGroup || isOptimisticallyEnrolled;
  const electiveState = isOptionalElective ? (isEnrolled ? "enrolled" : "available") : undefined;

  return (
    <>
      <div
        data-testid="parent-schedule-card"
        data-parent-elective-state={electiveState}
        className="h-full w-full"
      >
        <StudentScheduleEventCard
          event={event}
          inlineAction={
            isOptionalElective && !isEnrolled ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-6 px-2 text-[11px] shadow-sm transition-colors hover:bg-foreground hover:text-background"
                onClick={(eventClick) => {
                  eventClick.preventDefault();
                  eventClick.stopPropagation();
                  setConfirmOpen(true);
                }}
              >
                Записаться
              </Button>
            ) : undefined
          }
          inlineCardClassName={
            isOptionalElective && !isEnrolled
              ? "border-amber-200/70 bg-amber-100/40"
              : undefined
          }
        />
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
            <AlertDialogCancel disabled={enrollMutation.isPending}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={enrollMutation.isPending}
              onClick={(dialogEvent) => {
                dialogEvent.preventDefault();
                enrollMutation.mutate();
              }}
            >
              <span className={cn("inline-flex items-center gap-1", enrollMutation.isPending && "opacity-90")}>
                {enrollMutation.isPending ? <Spinner /> : null}
                Подтвердить
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
