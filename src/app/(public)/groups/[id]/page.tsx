import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/db'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PageHeader } from '@/components/common/PageHeader'
import { StandingsTable } from '@/modules/standings/components/StandingsTable'
import { calculateStandings } from '@/modules/standings/utils'
import { StatusBadge } from '@/components/common/StatusBadge'
import { getGroupStats } from '@/modules/statistics/queries'

export const revalidate = 30

interface GroupPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { id } = await params
  const group = await prisma.group.findUnique({ where: { id }, select: { name: true } })
  if (!group) return { title: 'Group Not Found' }
  return {
    title: `${group.name} | WBU 2026`,
    description: `${group.name} standings, matches, and statistics`,
  }
}

export default async function GroupDetailPage({ params }: GroupPageProps) {
  const { id } = await params
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      teams: { select: { id: true, name: true, shortName: true, logo: true } },
      matches: {
        orderBy: { matchDate: 'asc' },
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        },
      },
    },
  })

  if (!group) notFound()

  const completedMatches = group.matches.filter((m) => m.status === 'FULL_TIME')
  const standings = calculateStandings(
    group.teams,
    completedMatches.map((m) => ({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
    }))
  )

  const groupStats = await getGroupStats(id)

  return (
    <PublicLayout contentClassName="max-w-5xl">
      <div className="space-y-8">
        <PageHeader title={group.name} description="Group standings, matches, and statistics" />

        <StandingsTable groupName={group.name} standings={standings} />

        {/* Group Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold">{groupStats.totalGoals}</p>
            <p className="text-xs text-muted-foreground">Total Goals</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-lg font-bold truncate">
              {groupStats.topScorer ? (
                <Link href={`/players/${groupStats.topScorer.id}`} className="hover:underline">
                  {groupStats.topScorer.name}
                </Link>
              ) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              Top Scorer {groupStats.topScorer ? `(${groupStats.topScorer.goals})` : ''}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-lg font-bold truncate">
              {groupStats.mostCarded ? (
                <Link href={`/players/${groupStats.mostCarded.id}`} className="hover:underline">
                  {groupStats.mostCarded.name}
                </Link>
              ) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              Most Carded {groupStats.mostCarded ? `(${groupStats.mostCarded.totalCards})` : ''}
            </p>
          </div>
        </div>

        {/* Group Matches */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Matches</h3>
          <div className="space-y-2">
            {group.matches.filter((m) => m.homeTeam && m.awayTeam).map((match) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
              >
                <div className="flex-1 text-right">
                  <span className="font-medium">{match.homeTeam!.shortName}</span>
                </div>
                <div className="text-center min-w-[60px]">
                  {match.status === 'FULL_TIME' || match.status !== 'SCHEDULED' ? (
                    <span className="font-bold">{match.homeScore} — {match.awayScore}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {new Date(match.matchDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-medium">{match.awayTeam!.shortName}</span>
                </div>
                <StatusBadge status={match.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
