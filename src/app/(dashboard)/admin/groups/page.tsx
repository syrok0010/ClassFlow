import type { GroupType } from "@/generated/prisma/client";
import { getGroupsTree, getSubjects } from "./_actions/group-actions";
import { GroupsTableClient } from "./_components/groups-table-client";

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

  const [groups, subjects] = await Promise.all([
    getGroupsTree({ search, type }),
    getSubjects(),
  ]);

  return <GroupsTableClient initialGroups={groups} subjects={subjects} />;
}
