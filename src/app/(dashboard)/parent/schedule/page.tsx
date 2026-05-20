import { redirect } from "next/navigation";

import { parseScheduleDate, parseScheduleView } from "@/features/schedule/lib/query-params";

import { ParentScheduleView } from "./_components/parent-schedule-view";
import { getParentSchedulePageData } from "./_lib/get-parent-schedule-page-data";
import {format} from "date-fns";

export const dynamic = "force-dynamic";

interface ParentSchedulePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ParentSchedulePage({ searchParams }: ParentSchedulePageProps) {
  const resolvedSearchParams = await searchParams;
  const viewMode = parseScheduleView(resolvedSearchParams.view);
  const anchorDate = parseScheduleDate(resolvedSearchParams.date);
  const requestedStudentId = typeof resolvedSearchParams.studentId === "string"
    ? resolvedSearchParams.studentId
    : undefined;
  const pageData = await getParentSchedulePageData({
    anchorDate,
    viewMode,
    requestedStudentId,
  });

  const hasInvalidView =
    resolvedSearchParams.view !== undefined &&
    resolvedSearchParams.view !== "day" &&
    resolvedSearchParams.view !== "week";

  const hasInvalidDate =
    resolvedSearchParams.date !== undefined &&
    (typeof resolvedSearchParams.date !== "string" ||
      format(anchorDate, "yyyy-MM-dd") !== resolvedSearchParams.date);

  if (pageData.selectedStudentId &&
      (requestedStudentId !== pageData.selectedStudentId || hasInvalidView || hasInvalidDate)) {
    redirect(`/parent/schedule?studentId=${pageData.selectedStudentId}&date=${format(anchorDate, "yyyy-MM-dd")}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Расписание детей</h1>
      </div>

      <ParentScheduleView data={pageData} />
    </div>
  );
}