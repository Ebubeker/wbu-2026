import type { Metadata } from 'next'
import { Target, AlertTriangle, CalendarDays, TrendingUp } from 'lucide-react'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/modules/statistics/components/StatCard'
import { TopScorersTable } from '@/modules/statistics/components/TopScorersTable'
import { MostCardedTable } from '@/modules/statistics/components/MostCardedTable'
import { TeamRankingsTable } from '@/modules/statistics/components/TeamRankingsTable'
import { MatchRecordsCard } from '@/modules/statistics/components/MatchRecordsCard'
import {
  getCompetitionStats,
  getTopScorers,
  getMostCardedPlayers,
  getTeamRankings,
  getMatchRecords,
} from '@/modules/statistics/queries'

export const revalidate = 30

export const metadata: Metadata = {
  title: 'Statistics | WBU 2026',
  description: 'WBU 2026 Championship competition statistics',
}

export default async function StatisticsPage() {
  const [stats, topScorers, mostCarded, rankings, records] = await Promise.all([
    getCompetitionStats(),
    getTopScorers(10),
    getMostCardedPlayers(10),
    getTeamRankings(),
    getMatchRecords(),
  ])

  return (
    <PublicLayout contentClassName="max-w-5xl">
      <div className="space-y-8">
        <PageHeader
          title="Statistics"
          description="Competition stats and records"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Matches Played" value={stats.completedMatches} icon={CalendarDays} />
          <StatCard label="Total Goals" value={stats.totalGoals} icon={Target} />
          <StatCard label="Avg Goals/Match" value={stats.avgGoalsPerMatch} icon={TrendingUp} />
          <StatCard label="Total Cards" value={stats.totalYellowCards + stats.totalRedCards} icon={AlertTriangle} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TopScorersTable scorers={topScorers} />
          <MostCardedTable players={mostCarded} />
        </div>

        <TeamRankingsTable rankings={rankings} />
        <MatchRecordsCard biggestWin={records.biggestWin} highestScoring={records.highestScoring} />
      </div>
    </PublicLayout>
  )
}
