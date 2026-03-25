import type { GroupType } from "@/generated/prisma/client";
import { getGroupsTree, getSubjects } from "./_actions/group-actions";
import { GroupsTableClient } from "./_components/groups-table-client";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const VALID_TYPES: GroupType[] = ["CLASS", "ELECTIVE_GROUP"];

export default async function GroupsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const search =
    typeof searchParams.search === "string" ? searchParams.search : undefined;
  const typeParam =
    typeof searchParams.type === "string" ? searchParams.type : undefined;
  const type = VALID_TYPES.includes(typeParam as GroupType)
    ? (typeParam as GroupType)
    : undefined;

  const [groupsResponse, subjectsResponse] = await Promise.all([
    getGroupsTree({ search, type }),
    getSubjects(),
  ]);

  const errors = [groupsResponse.error, subjectsResponse.error].filter(
    (value): value is string => Boolean(value)
  );

  if (errors.length > 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4">
        <div className="w-full rounded-2xl border bg-card p-8 text-card-foreground shadow-sm">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Не удалось загрузить справочник групп
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Произошла ошибка на стороне сервера. Попробуйте обновить страницу.
          </p>

          <div className="mt-5 space-y-2 rounded-lg border bg-muted/40 p-3">
            {errors.map((message, index) => (
              <p key={`${message}-${index}`} className="text-sm text-foreground">
                • {message}
              </p>
            ))}
          </div>

          <div className="mt-6 flex gap-2">
            <Link
              href="/admin/groups"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Обновить страницу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GroupsTableClient
      initialGroups={groupsResponse.result ?? []}
      subjects={subjectsResponse.result ?? []}
    />
  );
}
