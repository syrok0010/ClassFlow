import type {ScheduleViewMode} from "@/features/schedule";
import {AdminScheduleEvent} from "@/app/(dashboard)/admin/schedule/_lib/admin-schedule-types";

export type AdminScheduleEntriesScope = "group" | "teacher" | "room";

export type AdminScheduleEntriesOption = {
    id: string;
    label: string;
    description?: string;
};

export type AdminScheduleEntriesPageData = {
    anchorDate: Date;
    dateParam: string;
    viewMode: ScheduleViewMode;
    scope: AdminScheduleEntriesScope;
    targetId: string | null;
    selectedTarget: AdminScheduleEntriesOption | null;
    options: Record<AdminScheduleEntriesScope, AdminScheduleEntriesOption[]>;
    events: AdminScheduleEvent[];
};

export type GetAdminScheduleEntriesPageDataParams = {
    anchorDate: Date;
    viewMode: ScheduleViewMode;
    scope: AdminScheduleEntriesScope;
    targetId: string | null;
};

export type ScheduleTargetOption = {
    id: string;
    scope: AdminScheduleEntriesScope;
    targetId: string;
    label: string;
    description: string;
};