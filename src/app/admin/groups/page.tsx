import { PageHeader } from "@/components/common/PageHeader"
import { GroupManager } from "@/modules/groups/components/GroupManager"
import { getGroups } from "@/modules/groups/queries"
import prisma from "@/lib/db"

export const dynamic = 'force-dynamic'

export default async function GroupsPage() {
  const groups = await getGroups()

  const unassignedTeams = await prisma.team.findMany({
    where: { groupId: null },
    select: {
      id: true,
      name: true,
      shortName: true,
      logo: true,
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Groups"
        description="Manage tournament groups and team assignments"
      />
      <GroupManager groups={groups} unassignedTeams={unassignedTeams} />
    </div>
  )
}
