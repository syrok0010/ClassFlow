import { redirect } from "next/navigation";

import { parseScheduleDate, parseScheduleView } from "@/features/schedule/lib/query-params";

import { ParentScheduleView } from "./_components/parent-schedule-view";
import { getParentSchedulePageData } from "./_lib/get-parent-schedule-page-data";

export const dynamic = "force-dynamic";

interface ParentSchedulePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ParentSchedulePage({ searchParams }: ParentSchedulePageProps) {
  const resolvedSearchParams = await searchParams;
  const viewMode = parseScheduleView(resolvedSearchParams.view);
  const anchorDate = parseScheduleDate(resolvedSearchParams.date);
  const requestedStudentId = getSingleSearchParam(resolvedSearchParams.studentId);
  const pageData = await getParentSchedulePageData({
    anchorDate,
    viewMode,
    requestedStudentId,
  });

  if (
    pageData.selectedStudentId &&
    requestedStudentId !== pageData.selectedStudentId
  ) {
    redirect(buildParentScheduleUrl(resolvedSearchParams, pageData.selectedStudentId));
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

function getSingleSearchParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  return undefined;
}

function buildParentScheduleUrl(
  searchParams: { [key: string]: string | string[] | undefined },
  selectedStudentId: string
): string {
  const nextSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "studentId") {
      continue;
    }

    if (typeof value === "string") {
      nextSearchParams.set(key, value);
    }
  }

  nextSearchParams.set("studentId", selectedStudentId);

  return `/parent/schedule?${nextSearchParams.toString()}`;
}
