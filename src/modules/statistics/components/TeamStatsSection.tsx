import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { FormBadges } from './FormBadges'
import type { TeamStats } from '../types'

export function TeamStatsSection({ stats }: { stats: TeamStats }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Team Statistics</h3>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.won}</p><p className="text-[10px] text-muted-foreground">Won</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.drawn}</p><p className="text-[10px] text-muted-foreground">Drawn</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.lost}</p><p className="text-[10px] text-muted-foreground">Lost</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.goalsFor}</p><p className="text-[10px] text-muted-foreground">Goals For</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.goalsAgainst}</p><p className="text-[10px] text-muted-foreground">Goals Against</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.goalDifference > 0 ? `+${stats.goalDifference}` : stats.goalDifference}</p><p className="text-[10px] text-muted-foreground">Goal Diff</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.points}</p><p className="text-[10px] text-muted-foreground">Points</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.cleanSheets}</p><p className="text-[10px] text-muted-foreground">Clean Sheets</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-yellow-400">{stats.yellowCards}</p><p className="text-[10px] text-muted-foreground">Yellow Cards</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-red-400">{stats.redCards}</p><p className="text-[10px] text-muted-foreground">Red Cards</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Form:</span>
        <FormBadges form={stats.form} />
      </div>

      {stats.topScorer && (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Top Scorer</p>
          <Link href={`/players/${stats.topScorer.playerId}`} className="font-medium hover:underline">
            {stats.topScorer.playerName}
          </Link>
          <span className="ml-2 text-sm text-muted-foreground">({stats.topScorer.goals} goals)</span>
        </div>
      )}
    </div>
  )
}
