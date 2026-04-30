"use client";

import { useTransition } from "react";
import { addDays, format } from "date-fns";
import { useQueryState } from "nuqs";

export function useTeacherAvailabilityWeekUrlState(currentWeekStart: Date) {
  const [isPending, startTransition] = useTransition();
  const [, setWeekStart] = useQueryState("weekStart", {
    defaultValue: format(currentWeekStart, "yyyy-MM-dd"),
    shallow: false,
  });

  function shiftWeek(offset: number) {
    const nextWeekStart = format(addDays(currentWeekStart, offset * 7), "yyyy-MM-dd");

    startTransition(() => {
      void setWeekStart(nextWeekStart);
    });
  }

  return {
    isWeekLoading: isPending,
    shiftWeek,
  };
}
