import type { Metadata } from "next"
import { notFound } from "next/navigation"
import prisma from "@/lib/db"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { TeamDetail } from "@/modules/teams/components/TeamDetail"
import { getTeamStats } from "@/modules/statistics/queries"

export const revalidate = 30

interface TeamPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: TeamPageProps): Promise<Metadata> {
  const { id } = await params
  const team = await prisma.team.findUnique({
    where: { id },
    select: { name: true },
  })

  if (!team) {
    return { title: "Team Not Found" }
  }

  return {
    title: `${team.name} | WBU 2026`,
    description: `${team.name} - WBU 2026 Championship team profile`,
  }
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { id } = await params
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      players: {
        select: {
          id: true,
          name: true,
          number: true,
          position: true,
          photo: true,
        },
        orderBy: { number: "asc" },
      },
      group: { select: { id: true, name: true } },
      captain: { select: { id: true, username: true } },
    },
  })

  if (!team) {
    notFound()
  }

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: id }, { awayTeamId: id }],
    },
    orderBy: { matchDate: "desc" },
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
      awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
    },
  })

  const teamData = {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    logo: team.logo,
    description: team.description,
    groupId: team.groupId,
    group: team.group,
    captain: team.captain,
    players: team.players,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  }

  const teamStats = await getTeamStats(id)

  const matchData = matches
    .filter((m) => m.homeTeam && m.awayTeam)
    .map((m) => ({
      id: m.id,
      homeTeamId: m.homeTeamId!,
      awayTeamId: m.awayTeamId!,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      matchDate: m.matchDate.toISOString(),
      stage: m.stage,
      venue: m.venue,
      homeTeam: m.homeTeam!,
      awayTeam: m.awayTeam!,
    }))

  return (
    <PublicLayout maxWidthClassName="max-w-6xl">
      <div>
        <TeamDetail team={teamData} matches={matchData} stats={teamStats} />
      </div>
    </PublicLayout>
  )
}
