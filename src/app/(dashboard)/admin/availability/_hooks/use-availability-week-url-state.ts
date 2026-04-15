"use client";

import { useTransition } from "react";
import { useQueryState } from "nuqs";
import { addDays, toIsoDate } from "../_lib/utils";

export function useAvailabilityWeekUrlState(currentWeekStart: string) {
  const [isPending, startTransition] = useTransition();
  const [, setWeekStart] = useQueryState("weekStart", {
    defaultValue: currentWeekStart,
    shallow: false,
  });

  function shiftWeek(offset: number) {
    const nextWeekStart = toIsoDate(
      addDays(new Date(`${currentWeekStart}T00:00:00`), offset * 7),
    );

    startTransition(() => {
      void setWeekStart(nextWeekStart);
    });
  }

  return {
    isWeekLoading: isPending,
    shiftWeek,
  };
}
