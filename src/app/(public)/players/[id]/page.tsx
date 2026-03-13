import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/db'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getPlayerStats } from '@/modules/statistics/queries'

export const dynamic = 'force-dynamic'

interface PlayerPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { id } = await params
  const player = await prisma.player.findUnique({
    where: { id },
    select: { name: true, team: { select: { name: true } } },
  })
  if (!player) return { title: 'Player Not Found' }
  return {
    title: `${player.name} | WBU 2026`,
    description: `${player.name} - ${player.team.name} player profile`,
  }
}

export default async function PlayerDetailPage({ params }: PlayerPageProps) {
  const { id } = await params
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      team: { select: { id: true, name: true, shortName: true, logo: true } },
    },
  })

  if (!player) notFound()

  const stats = await getPlayerStats(id)

  return (
    <PublicLayout contentClassName="max-w-3xl">
      <div className="space-y-6">
        {/* Player Header */}
        <div className="flex items-center gap-4">
          {player.photo ? (
            <img src={player.photo} alt={player.name} className="h-20 w-20 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-3xl font-bold text-primary">
              {player.number}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{player.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary">#{player.number}</Badge>
              <Badge variant="outline">{player.position}</Badge>
              <Link href={`/teams/${player.team.id}`} className="text-sm text-muted-foreground hover:underline">
                {player.team.name}
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{stats.goals}</p>
              <p className="text-xs text-muted-foreground">Goals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{stats.matchesPlayed}</p>
              <p className="text-xs text-muted-foreground">Matches</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-400">{stats.yellowCards}</p>
              <p className="text-xs text-muted-foreground">Yellow Cards</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-400">{stats.redCards}</p>
              <p className="text-xs text-muted-foreground">Red Cards</p>
            </CardContent>
          </Card>
        </div>

        {/* Match History */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Match History</h2>
          {stats.matchHistory.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No matches played yet</p>
          ) : (
            <div className="space-y-2">
              {stats.matchHistory.map((entry) => (
                <Link
                  key={entry.matchId}
                  href={`/matches/${entry.matchId}`}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">vs {entry.opponent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.matchDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{entry.score}</p>
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                        entry.result === 'W' ? 'bg-emerald-500/20 text-emerald-400' :
                        entry.result === 'D' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {entry.result}
                      </span>
                    </div>
                  </div>
                  {(entry.goals.length > 0 || entry.cards.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {entry.goals.map((g, i) => (
                        <span key={i} className="rounded bg-muted px-2 py-0.5">
                          ⚽ {g.minute}&apos;{g.isOwnGoal ? ' (OG)' : ''}
                        </span>
                      ))}
                      {entry.cards.map((c, i) => (
                        <span key={i} className="rounded bg-muted px-2 py-0.5">
                          {c.type === 'YELLOW' ? '🟨' : '🟥'} {c.minute}&apos;
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  )
}
