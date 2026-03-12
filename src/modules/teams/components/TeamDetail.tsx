import Image from 'next/image'
import { Shield, Trophy, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlayerCard } from '@/modules/players/components/PlayerCard'
import { cn } from '@/lib/utils'
import type { TeamWithPlayers } from '../types'
import type { PlayerData } from '@/modules/players/types'

interface MatchEntry {
  id: string
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
  status: string
  matchDate: string | Date
  stage: string
  venue?: string | null
  homeTeam?: { id: string; name: string; shortName: string; logo: string | null }
  awayTeam?: { id: string; name: string; shortName: string; logo: string | null }
}

interface TeamDetailProps {
  team: TeamWithPlayers
  matches: MatchEntry[]
}

function getMatchResult(
  match: MatchEntry,
  teamId: string
): 'W' | 'D' | 'L' | null {
  if (match.status !== 'FULL_TIME') return null
  const isHome = match.homeTeamId === teamId
  const teamScore = isHome ? match.homeScore : match.awayScore
  const opponentScore = isHome ? match.awayScore : match.homeScore
  if (teamScore > opponentScore) return 'W'
  if (teamScore < opponentScore) return 'L'
  return 'D'
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string
  value: number | string
  className?: string
}) {
  return (
    <div className={cn('rounded-[16px] border border-white/10 bg-background p-4 text-center', className)}>
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
    </div>
  )
}

export function TeamDetail({ team, matches }: TeamDetailProps) {
  const completedMatches = matches.filter((match) => match.status === 'FULL_TIME')
  const stats = {
    played: completedMatches.length,
    wins: completedMatches.filter((match) => getMatchResult(match, team.id) === 'W').length,
    draws: completedMatches.filter((match) => getMatchResult(match, team.id) === 'D').length,
    losses: completedMatches.filter((match) => getMatchResult(match, team.id) === 'L').length,
    goalsFor: completedMatches.reduce((sum, match) => {
      const isHome = match.homeTeamId === team.id
      return sum + (isHome ? match.homeScore : match.awayScore)
    }, 0),
    goalsAgainst: completedMatches.reduce((sum, match) => {
      const isHome = match.homeTeamId === team.id
      return sum + (isHome ? match.awayScore : match.homeScore)
    }, 0),
  }

  const goalDifference = stats.goalsFor - stats.goalsAgainst

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 overflow-hidden rounded-[20px] border border-white/10 bg-background p-3">
              {team.logo ? (
                <Image
                  src={team.logo}
                  alt={team.name}
                  fill
                  className="object-contain p-3"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Shield className="h-12 w-12 text-primary" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge variant="secondary">{team.shortName}</Badge>
                {team.group && <Badge variant="outline">{team.group.name}</Badge>}
              </div>

              <h1 className="text-4xl font-bold text-foreground">{team.name}</h1>

              {team.captain && (
                <p className="text-sm text-muted-foreground">
                  Captain: {team.captain.username}
                </p>
              )}

              {team.description && (
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                  {team.description}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {stats.played > 0 && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/75">
                Performance
              </p>
              <h3 className="mt-2 flex items-center justify-center gap-2 text-2xl font-semibold text-foreground sm:justify-start">
                <Trophy className="h-5 w-5 text-primary" />
                Statistics
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
              <StatCard label="Played" value={stats.played} />
              <StatCard label="Wins" value={stats.wins} className="border-emerald-400/20 bg-emerald-500/10" />
              <StatCard label="Draws" value={stats.draws} className="border-amber-400/20 bg-amber-500/10" />
              <StatCard label="Losses" value={stats.losses} className="border-rose-400/20 bg-rose-500/10" />
              <StatCard label="GF" value={stats.goalsFor} />
              <StatCard label="GA" value={stats.goalsAgainst} />
              <StatCard label="GD" value={goalDifference > 0 ? `+${goalDifference}` : goalDifference} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-primary/75">
                Squad
              </p>
              <h3 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-foreground">
                <Users className="h-5 w-5 text-primary" />
                Roster
              </h3>
            </div>
            <Badge variant="secondary">{team.players.length} players</Badge>
          </div>

          {team.players.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {team.players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player as PlayerData}
                />
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No players registered yet.
            </p>
          )}
        </CardContent>
      </Card>

      {matches.length > 0 && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/75">
                Results Log
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                Match history
              </h3>
            </div>

            <div className="space-y-3">
              {matches.map((match) => {
                const isHome = match.homeTeamId === team.id
                const opponent = isHome ? match.awayTeam : match.homeTeam
                const result = getMatchResult(match, team.id)
                const resultClassName =
                  result === 'W'
                    ? 'border-emerald-300/20 bg-emerald-400/15 text-emerald-100'
                    : result === 'L'
                      ? 'border-rose-300/20 bg-rose-400/15 text-rose-100'
                      : result === 'D'
                        ? 'border-amber-300/20 bg-amber-400/15 text-amber-100'
                        : 'border-white/10 bg-background text-foreground'

                return (
                  <div
                    key={match.id}
                    className="flex flex-col gap-3 rounded-[16px] border border-white/10 bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{match.stage.replaceAll('_', ' ')}</Badge>
                        <p className="font-medium text-foreground">
                          {isHome ? 'vs' : '@'} {opponent?.name ?? 'TBD'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:justify-end">
                      {match.status === 'FULL_TIME' ? (
                        <>
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${resultClassName}`}>
                            {result}
                          </span>
                          <span className="text-lg font-semibold tabular-nums text-foreground">
                            {match.homeScore} - {match.awayScore}
                          </span>
                        </>
                      ) : (
                        <Badge variant="secondary">{match.status.replaceAll('_', ' ')}</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
