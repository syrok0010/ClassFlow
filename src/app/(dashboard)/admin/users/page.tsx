import { Suspense } from "react";
import { getUsersAction } from "./_actions/user-actions";
import { UsersTableClient } from "./_components/users-table-client";
import type { DomainRole } from "./_lib/types";
import type { UserStatus } from "@/generated/prisma/enums";

export default async function UsersPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  
  const search = typeof searchParams.search === "string" ? searchParams.search : undefined;
  const domainRoleParam = typeof searchParams.role === "string" ? searchParams.role : undefined;
  const statusParam = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const domainRole = domainRoleParam && domainRoleParam !== "all" ? (domainRoleParam as DomainRole) : undefined;
  const status = statusParam && statusParam !== "all" ? (statusParam as UserStatus) : undefined;

  const users = await getUsersAction({ search, domainRole, status });

  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Загрузка таблицы...</div>}>
      <UsersTableClient users={users} />
    </Suspense>
  );
}
