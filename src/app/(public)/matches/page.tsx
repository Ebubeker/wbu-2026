import prisma from "@/lib/db"
import { PageHeader } from "@/components/common/PageHeader"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { MatchSchedule } from "@/modules/matches/components/MatchSchedule"

export const dynamic = 'force-dynamic'

export default async function MatchesPage() {
  const [matches, groups] = await Promise.all([
    prisma.match.findMany({
      where: { homeTeamId: { not: null }, awayTeamId: { not: null } },
      orderBy: { matchDate: "asc" },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        group: { select: { id: true, name: true } },
      },
    }),
    prisma.group.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ])

  const serializedMatches = matches
    .filter((m) => m.homeTeam && m.awayTeam)
    .map((match) => ({
      id: match.id,
      homeTeam: match.homeTeam!,
      awayTeam: match.awayTeam!,
      homePlaceholder: match.homePlaceholder,
      awayPlaceholder: match.awayPlaceholder,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      stage: match.stage,
      matchDate: match.matchDate.toISOString(),
      venue: match.venue,
      matchMinute: match.matchMinute,
      groupId: match.groupId,
      group: match.group,
    }))

  return (
    <PublicLayout contentClassName="max-w-7xl">
      <div className="space-y-6">
        <PageHeader title="Match Schedule" description="View all matches and results" />
        <MatchSchedule matches={serializedMatches} groups={groups} />
      </div>
    </PublicLayout>
  )
}
