"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { useQueryState } from "nuqs";

import { FilterableEmptyState } from "@/components/ui/filterable-empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StudentScheduleView } from "@/features/schedule/student/student-schedule-view";

import { ParentScheduleEventCard } from "./parent-schedule-event-card";
import type { ParentSchedulePageData } from "../_lib/get-parent-schedule-page-data";

export interface ParentScheduleViewProps {
  data: ParentSchedulePageData;
}

export function ParentScheduleView({ data }: ParentScheduleViewProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticEnrolledByScope, setOptimisticEnrolledByScope] = useState<
    Record<string, string[]>
  >({});
  const [currentStudentId, setCurrentStudentId] = useQueryState("studentId", {
    defaultValue: data.selectedStudentId ?? "",
    shallow: false,
    startTransition,
  });
  const selectedChild = useMemo(
    () => data.children.find((child) => child.id === data.selectedStudentId) ?? null,
    [data.children, data.selectedStudentId]
  );
  const enrollmentScopeKey = `${data.selectedStudentId ?? "none"}:${data.dateParam}:${data.viewMode}`;
  const optimisticEnrolledGroupIdSet = useMemo(
    () => new Set(optimisticEnrolledByScope[enrollmentScopeKey] ?? []),
    [enrollmentScopeKey, optimisticEnrolledByScope]
  );

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
    <div className="flex flex-col">
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
        renderEventCard={(event) => (
          <ParentScheduleEventCard
            event={event}
            studentId={data.selectedStudentId!}
            studentName={selectedChild?.fullName ?? "Ребенок"}
            isOptimisticallyEnrolled={
              event.deliveryGroupId ? optimisticEnrolledGroupIdSet.has(event.deliveryGroupId) : false
            }
            onEnrollmentSuccess={(groupId) => {
              setOptimisticEnrolledByScope((current) => {
                const scopeIds = current[enrollmentScopeKey] ?? [];
                if (scopeIds.includes(groupId)) {
                  return current;
                }

                return {
                  ...current,
                  [enrollmentScopeKey]: [...scopeIds, groupId],
                };
              });
            }}
          />
        )}
      />
    </div>
  );
}
