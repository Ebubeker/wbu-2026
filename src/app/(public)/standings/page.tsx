import prisma from "@/lib/db"
import { PageHeader } from "@/components/common/PageHeader"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { StandingsTable } from "@/modules/standings/components/StandingsTable"
import { calculateStandings } from "@/modules/standings/utils"

export const dynamic = 'force-dynamic'

export default async function StandingsPage() {
  const groups = await prisma.group.findMany({
    orderBy: { order: "asc" },
    include: {
      teams: {
        select: { id: true, name: true, shortName: true, logo: true },
      },
    },
  })

  const groupStandings = await Promise.all(
    groups.map(async (group) => {
      const matches = await prisma.match.findMany({
        where: {
          groupId: group.id,
          status: "FULL_TIME",
        },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
          status: true,
        },
      })

      const standings = calculateStandings(group.teams, matches)

      return {
        group: { id: group.id, name: group.name, order: group.order },
        standings,
      }
    })
  )

  return (
    <PublicLayout contentClassName="max-w-7xl">
      <div className="space-y-6">
        <PageHeader
          title="Group Standings"
          description="Current group stage standings"
        />
        <div className={`grid gap-8 ${groupStandings.length === 2 ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          {groupStandings.map(({ group, standings }) => (
            <StandingsTable
              key={group.id}
              groupId={group.id}
              groupName={group.name}
              standings={standings}
            />
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
