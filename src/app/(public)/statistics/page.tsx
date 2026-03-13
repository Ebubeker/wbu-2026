import type { Metadata } from 'next'
import Link from 'next/link'
import { Target, AlertTriangle, CalendarDays, TrendingUp, Shield } from 'lucide-react'
import prisma from '@/lib/db'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/modules/statistics/components/StatCard'
import { TopScorersTable } from '@/modules/statistics/components/TopScorersTable'
import { MostCardedTable } from '@/modules/statistics/components/MostCardedTable'
import { TeamRankingsTable } from '@/modules/statistics/components/TeamRankingsTable'
import { MatchRecordsCard } from '@/modules/statistics/components/MatchRecordsCard'
import { FormBadges } from '@/modules/statistics/components/FormBadges'
import { StandingsTable } from '@/modules/standings/components/StandingsTable'
import { calculateStandings } from '@/modules/standings/utils'
import {
  getCompetitionStats,
  getTopScorers,
  getMostCardedPlayers,
  getTeamRankings,
  getMatchRecords,
  getGroupStats,
} from '@/modules/statistics/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Statistics | WBU 2026',
  description: 'WBU 2026 Championship competition statistics',
}

export default async function StatisticsPage() {
  const [stats, topScorers, mostCarded, rankings, records, groups] = await Promise.all([
    getCompetitionStats(),
    getTopScorers(10),
    getMostCardedPlayers(10),
    getTeamRankings(),
    getMatchRecords(),
    prisma.group.findMany({
      orderBy: { order: 'asc' },
      include: {
        teams: { select: { id: true, name: true, shortName: true, logo: true } },
      },
    }),
  ])

  // Fetch group stats and standings in parallel
  const groupData = await Promise.all(
    groups.map(async (group) => {
      const [groupStats, matches] = await Promise.all([
        getGroupStats(group.id),
        prisma.match.findMany({
          where: { groupId: group.id, status: 'FULL_TIME' },
          select: {
            homeTeamId: true,
            awayTeamId: true,
            homeScore: true,
            awayScore: true,
            status: true,
          },
        }),
      ])
      const standings = calculateStandings(group.teams, matches)
      return { group, groupStats, standings }
    })
  )

  return (
    <PublicLayout contentClassName="max-w-5xl">
      <div className="space-y-8">
        <PageHeader
          title="Statistics"
          description="Competition stats and records"
        />

        {/* Overview stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Matches Played" value={stats.completedMatches} icon={CalendarDays} />
          <StatCard label="Total Goals" value={stats.totalGoals} icon={Target} />
          <StatCard label="Avg Goals/Match" value={stats.avgGoalsPerMatch} icon={TrendingUp} />
          <StatCard label="Total Cards" value={stats.totalYellowCards + stats.totalRedCards} icon={AlertTriangle} />
        </div>

        {/* Top scorers & cards side by side */}
        <div className="grid gap-6 lg:grid-cols-2">
          <TopScorersTable scorers={topScorers} />
          <MostCardedTable players={mostCarded} />
        </div>

        {/* Team Rankings */}
        <TeamRankingsTable rankings={rankings} />

        {/* Group Statistics */}
        {groupData.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Group Statistics</h2>
            <div className={`grid gap-6 ${groupData.length === 2 ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
              {groupData.map(({ group, groupStats, standings }) => (
                <Card key={group.id}>
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <Link href={`/groups/${group.id}`} className="text-lg font-semibold hover:underline">
                        {group.name}
                      </Link>
                    </div>

                    {/* Group quick stats */}
                    <div className="mb-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-border bg-background p-3 text-center">
                        <p className="text-xl font-bold">{groupStats.totalGoals}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Goals</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-3 text-center">
                        <p className="truncate text-sm font-bold">
                          {groupStats.topScorer ? (
                            <Link href={`/players/${groupStats.topScorer.id}`} className="hover:underline">
                              {groupStats.topScorer.name}
                            </Link>
                          ) : '—'}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          Top Scorer {groupStats.topScorer ? `(${groupStats.topScorer.goals})` : ''}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-3 text-center">
                        <p className="truncate text-sm font-bold">
                          {groupStats.mostCarded ? (
                            <Link href={`/players/${groupStats.mostCarded.id}`} className="hover:underline">
                              {groupStats.mostCarded.name}
                            </Link>
                          ) : '—'}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          Most Cards {groupStats.mostCarded ? `(${groupStats.mostCarded.totalCards})` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Mini standings */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="pb-1.5 text-left pl-1">#</th>
                            <th className="pb-1.5 text-left">Team</th>
                            <th className="pb-1.5 text-center">P</th>
                            <th className="pb-1.5 text-center">W</th>
                            <th className="pb-1.5 text-center">D</th>
                            <th className="pb-1.5 text-center">L</th>
                            <th className="pb-1.5 text-center">GD</th>
                            <th className="pb-1.5 text-center font-bold">Pts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {standings.map((row) => (
                            <tr key={row.team.id}>
                              <td className="py-1.5 pl-1 text-muted-foreground">{row.position}</td>
                              <td className="py-1.5">
                                <Link href={`/teams/${row.team.id}`} className="font-medium hover:underline">
                                  {row.team.shortName}
                                </Link>
                              </td>
                              <td className="py-1.5 text-center text-muted-foreground">{row.played}</td>
                              <td className="py-1.5 text-center text-muted-foreground">{row.won}</td>
                              <td className="py-1.5 text-center text-muted-foreground">{row.drawn}</td>
                              <td className="py-1.5 text-center text-muted-foreground">{row.lost}</td>
                              <td className="py-1.5 text-center text-muted-foreground">
                                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                              </td>
                              <td className="py-1.5 text-center font-bold">{row.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Match Records */}
        <MatchRecordsCard biggestWin={records.biggestWin} highestScoring={records.highestScoring} />
      </div>
    </PublicLayout>
  )
}
