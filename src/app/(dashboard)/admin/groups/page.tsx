import { getGroupsTree, getSubjects } from "./actions";
import { GroupsClient } from "./groups-client";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const [groups, subjects] = await Promise.all([
    getGroupsTree(),
    getSubjects(),
  ]);

  return <GroupsClient initialGroups={groups} subjects={subjects} />;
}
