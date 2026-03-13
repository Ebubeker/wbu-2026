import prisma from "@/lib/db"
import { Users } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { TeamGrid } from "@/modules/teams/components/TeamGrid"
import { EmptyState } from "@/components/common/EmptyState"

export const revalidate = 60

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: {
      group: { select: { id: true, name: true } },
    },
  })

  const serializedTeams = teams.map((team) => ({
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    logo: team.logo,
    description: team.description,
    groupId: team.groupId,
    group: team.group,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  }))

  return (
    <PublicLayout contentClassName="max-w-7xl">
      <div className="space-y-6">
        <PageHeader title="Teams" description="All participating teams" />
        {serializedTeams.length > 0 ? (
          <TeamGrid teams={serializedTeams} />
        ) : (
          <EmptyState
            icon={Users}
            title="No teams yet"
            description="Teams will appear here once they are registered for the championship."
          />
        )}
      </div>
    </PublicLayout>
  )
}
