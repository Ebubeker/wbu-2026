import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import type { MatchRecord } from '../types'

interface MatchRecordsCardProps {
  biggestWin: MatchRecord | null
  highestScoring: MatchRecord | null
}

export function MatchRecordsCard({ biggestWin, highestScoring }: MatchRecordsCardProps) {
  if (!biggestWin && !highestScoring) {
    return <p className="text-center text-sm text-muted-foreground py-4">No match records yet</p>
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-semibold">Match Records</h3>
        </div>
        <div className="divide-y divide-border">
          {biggestWin && <RecordRow record={biggestWin} />}
          {highestScoring && highestScoring.matchId !== biggestWin?.matchId && (
            <RecordRow record={highestScoring} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function RecordRow({ record }: { record: MatchRecord }) {
  return (
    <Link href={`/matches/${record.matchId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-accent transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{record.label}</p>
        <p className="font-medium">
          {record.homeTeam.name} {record.homeScore} — {record.awayScore} {record.awayTeam.name}
        </p>
      </div>
    </Link>
  )
}
