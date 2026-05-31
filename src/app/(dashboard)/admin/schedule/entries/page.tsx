import { format } from "date-fns";
import { redirect } from "next/navigation";

import {
  parseScheduleDate,
  parseScheduleView,
} from "@/features/schedule";
import { getAdminScheduleEditorData } from "../_lib/get-admin-schedule-page-data";

import { AdminScheduleEntriesView } from "./_components/admin-schedule-entries-view";
import {
  getAdminScheduleEntriesPageData,
  parseAdminScheduleEntriesScope,
  parseAdminScheduleEntriesTargetId,
} from "./_lib/get-admin-schedule-entries-page-data";

export const dynamic = "force-dynamic";

export default async function AdminScheduleEntriesPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const viewMode = parseScheduleView(searchParams.view);
  const anchorDate = parseScheduleDate(searchParams.date);
  const scope = parseAdminScheduleEntriesScope(searchParams.scope);
  const targetId = parseAdminScheduleEntriesTargetId(searchParams.targetId);

  const hasInvalidView =
    searchParams.view !== undefined &&
    searchParams.view !== "day" &&
    searchParams.view !== "week";

  const hasInvalidDate =
    searchParams.date !== undefined &&
    (typeof searchParams.date !== "string" ||
      format(anchorDate, "yyyy-MM-dd") !== searchParams.date);

  const hasInvalidScope =
    searchParams.scope !== undefined &&
    searchParams.scope !== "group" &&
    searchParams.scope !== "teacher" &&
    searchParams.scope !== "room";

  if (hasInvalidDate || hasInvalidView || hasInvalidScope) {
    const normalizedParams = new URLSearchParams();
    normalizedParams.set("date", format(anchorDate, "yyyy-MM-dd"));
    if (viewMode !== "week") {
      normalizedParams.set("view", viewMode);
    }
    if (scope !== "group") {
      normalizedParams.set("scope", scope);
    }
    if (targetId) {
      normalizedParams.set("targetId", targetId);
    }

    redirect(`/admin/schedule/entries?${normalizedParams.toString()}`);
  }

  const [pageData, editorData] = await Promise.all([
    getAdminScheduleEntriesPageData({
      anchorDate,
      viewMode,
      scope,
      targetId,
    }),
    getAdminScheduleEditorData(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Фактическое расписание</h1>
        <p className="text-sm text-muted-foreground">
          Просматривайте расписание по группе, преподавателю или кабинету и исправляйте отдельные записи.
        </p>
      </div>

      <AdminScheduleEntriesView
        {...pageData}
        classRows={editorData.classRows}
        subjectOptions={editorData.subjectOptions}
        directGroupOptions={editorData.directGroupOptions}
        electiveGroupOptions={editorData.electiveGroupOptions}
        roomOptions={editorData.roomOptions}
        teacherOptions={editorData.teacherOptions}
        lessonDurationByGroupSubject={editorData.lessonDurationByGroupSubject}
      />
    </div>
  );
}
