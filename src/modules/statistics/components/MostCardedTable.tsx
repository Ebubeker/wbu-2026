import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import type { MostCardedPlayer } from '../types'

export function MostCardedTable({ players }: { players: MostCardedPlayer[] }) {
  if (players.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-4">No cards issued yet</p>
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-semibold">Most Carded Players</h3>
        </div>
        <div className="divide-y divide-border">
          {players.map((player, i) => (
            <div key={player.playerId} className="flex items-center gap-3 px-5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/players/${player.playerId}`} className="font-medium hover:underline">
                  {player.playerName}
                </Link>
                <Link href={`/teams/${player.teamId}`} className="block text-xs text-muted-foreground hover:underline">
                  {player.teamName}
                </Link>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-yellow-400">{player.yellowCards}🟨</span>
                <span className="rounded bg-red-500/20 px-2 py-0.5 text-red-400">{player.redCards}🟥</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
