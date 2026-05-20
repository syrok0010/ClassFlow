"use client";

import { useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { useQueryState } from "nuqs";

import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StudentScheduleView } from "@/features/schedule/student/student-schedule-view";

import type { ParentSchedulePageData } from "../_lib/get-parent-schedule-page-data";

export interface ParentScheduleViewProps {
  data: ParentSchedulePageData;
}

export function ParentScheduleView({ data }: ParentScheduleViewProps) {
  const [isPending, startTransition] = useTransition();
  const [currentStudentId, setCurrentStudentId] = useQueryState("studentId", {
    defaultValue: data.selectedStudentId ?? "",
    shallow: false,
    startTransition,
  });

  if (data.children.length === 0 || !data.selectedStudentId) {
    return (
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <FilterableEmptyState
          hasFilters={false}
          empty={{
            icon: <CalendarDays />,
            title: "Нет привязанных детей",
            description: "К вашему профилю пока не привязаны ученики.",
          }}
        />
      </div>
    );
  }

  const isRefreshing = isPending || currentStudentId !== data.selectedStudentId;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto pb-1">
        <SegmentedControl
          value={data.selectedStudentId}
          onChange={(studentId) => {
            void setCurrentStudentId(studentId);
          }}
          options={data.children.map((child) => ({
            value: child.id,
            label: child.label,
            disabled: isRefreshing,
          }))}
          className="max-w-full"
          size="sm"
        />
      </div>

      <StudentScheduleView
        anchorDate={data.anchorDate}
        dateParam={data.dateParam}
        viewMode={data.viewMode}
        events={data.events}
      />
    </div>
  );
}
