import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import type { TopScorer } from '../types'

export function TopScorersTable({ scorers }: { scorers: TopScorer[] }) {
  if (scorers.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-4">No goals scored yet</p>
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-semibold">Top Scorers</h3>
        </div>
        <div className="divide-y divide-border">
          {scorers.map((scorer, i) => (
            <div key={scorer.playerId} className="flex items-center gap-3 px-5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/players/${scorer.playerId}`} className="font-medium hover:underline">
                  {scorer.playerName}
                </Link>
                <Link href={`/teams/${scorer.teamId}`} className="block text-xs text-muted-foreground hover:underline">
                  {scorer.teamName}
                </Link>
              </div>
              <span className="text-xl font-bold">{scorer.goals}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
