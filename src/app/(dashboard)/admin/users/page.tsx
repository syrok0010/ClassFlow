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
  const VALID_DOMAIN_ROLES: DomainRole[] = ["teacher", "student", "parent"];
  const domainRole = VALID_DOMAIN_ROLES.includes(domainRoleParam as DomainRole)
      ? (domainRoleParam as DomainRole)
      : undefined;
  const status = statusParam && statusParam !== "all" ? (statusParam as UserStatus) : undefined;

  const users = await getUsersAction({ search, domainRole, status });

  return <UsersTableClient users={users} />;
}
