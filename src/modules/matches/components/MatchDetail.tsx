'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatDate, formatTime, formatMatchMinute } from '@/lib/utils'
import { Calendar as CalendarIcon, Clock, MapPin, Radio } from 'lucide-react'
import { SSE_RETRY_INTERVAL } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { LineupDisplay } from '@/modules/lineups/components/LineupDisplay'
import { VotePanel } from '@/modules/voting/components/VotePanel'
import type { MatchWithEvents } from '../types'

interface MatchDetailProps {
  match: MatchWithEvents
}

type TimelineEvent = {
  id: string
  minute: number
  type: 'goal' | 'card'
  teamId: string
  playerName: string
  playerNumber: number
  isOwnGoal?: boolean
  cardType?: 'YELLOW' | 'RED'
}

function EventBadge({ event }: { event: TimelineEvent }) {
  if (event.type === 'goal') {
    return <Badge className="border-emerald-300/20 bg-emerald-400/15 text-emerald-100">Goal</Badge>
  }

  if (event.cardType === 'YELLOW') {
    return <Badge className="border-amber-300/20 bg-amber-400/15 text-amber-100">Yellow</Badge>
  }

  return <Badge className="border-rose-300/20 bg-rose-400/15 text-rose-100">Red</Badge>
}

function TeamPanel({
  name,
  shortName,
  logo,
}: {
  name: string
  shortName: string
  logo: string | null
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative h-20 w-20 overflow-hidden rounded-[20px] border border-white/10 bg-background p-3 sm:h-24 sm:w-24">
        {logo ? (
          <Image
            src={logo}
            alt={name}
            fill
            className="object-contain p-3"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-foreground">
            {shortName}
          </div>
        )}
      </div>
      <div>
        <p className="text-base font-semibold text-foreground sm:text-lg">{name}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          {shortName}
        </p>
      </div>
    </div>
  )
}

export function MatchDetail({ match: initialMatch }: MatchDetailProps) {
  const [match, setMatch] = useState(initialMatch)

  const isLive = ['FIRST_HALF', 'HALF_TIME', 'SECOND_HALF'].includes(match.status)
  const isScheduled = match.status === 'SCHEDULED'
  const isFullTime = match.status === 'FULL_TIME'

  const timelineEvents: TimelineEvent[] = [
    ...match.goals.map((goal) => ({
      id: goal.id,
      minute: goal.minute,
      type: 'goal' as const,
      teamId: goal.team.id,
      playerName: goal.player.name,
      playerNumber: goal.player.number,
      isOwnGoal: goal.isOwnGoal,
    })),
    ...match.cards.map((card) => ({
      id: card.id,
      minute: card.minute,
      type: 'card' as const,
      teamId: card.team.id,
      playerName: card.player.name,
      playerNumber: card.player.number,
      cardType: card.type,
    })),
  ].sort((a, b) => a.minute - b.minute)

  useEffect(() => {
    if (!isLive) return

    let eventSource: EventSource | null = null
    let pollInterval: ReturnType<typeof setInterval> | null = null

    async function refreshMatch() {
      try {
        const response = await fetch(`/api/matches/${match.id}`)
        if (response.ok) {
          const data = await response.json()
          setMatch(data)
        }
      } catch {
        // Ignore and retry on next reconnect or poll.
      }
    }

    function connectSSE() {
      eventSource = new EventSource(`/api/matches/${match.id}/live-stream`)

      eventSource.addEventListener('score_update', (event) => {
        const data = JSON.parse(event.data)
        setMatch((previous) => ({
          ...previous,
          homeScore: data.homeScore,
          awayScore: data.awayScore,
        }))
      })

      eventSource.addEventListener('minute_update', (event) => {
        const data = JSON.parse(event.data)
        setMatch((previous) => ({ ...previous, matchMinute: data.minute }))
      })

      eventSource.addEventListener('status_change', (event) => {
        const data = JSON.parse(event.data)
        setMatch((previous) => ({
          ...previous,
          status: data.status,
          matchMinute: data.matchMinute,
        }))
      })

      eventSource.addEventListener('goal_added', (event) => {
        const data = JSON.parse(event.data)
        setMatch((previous) => ({
          ...previous,
          homeScore: data.homeScore,
          awayScore: data.awayScore,
        }))
        refreshMatch()
      })

      eventSource.addEventListener('goal_removed', (event) => {
        const data = JSON.parse(event.data)
        setMatch((previous) => ({
          ...previous,
          homeScore: data.homeScore,
          awayScore: data.awayScore,
        }))
        refreshMatch()
      })

      eventSource.addEventListener('card_added', refreshMatch)
      eventSource.addEventListener('card_removed', refreshMatch)
      eventSource.addEventListener('match_ended', () => {
        setMatch((previous) => ({ ...previous, status: 'FULL_TIME' }))
      })

      eventSource.onerror = () => {
        eventSource?.close()
        eventSource = null

        if (!pollInterval) {
          pollInterval = setInterval(refreshMatch, SSE_RETRY_INTERVAL)
        }
      }
    }

    connectSSE()

    return () => {
      eventSource?.close()
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [match.id, isLive])

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <TeamPanel
              name={match.homeTeam?.name ?? match.homePlaceholder ?? '—'}
              shortName={match.homeTeam?.shortName ?? match.homePlaceholder ?? '—'}
              logo={match.homeTeam?.logo ?? null}
            />

            <div className="text-center">
              <div className="flex justify-center">
                <StatusBadge status={match.status} />
              </div>

              <div className="mt-4 rounded-[20px] border border-white/10 bg-background px-5 py-5">
                {isScheduled ? (
                  <>
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                      Kick-off
                    </p>
                    <p className="mt-2 text-3xl font-bold text-foreground sm:text-4xl">
                      {formatTime(match.matchDate)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatDate(match.matchDate)}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-3 text-5xl font-bold tabular-nums text-foreground sm:text-6xl">
                      <span>{match.homeScore}</span>
                      <span className="text-muted-foreground">-</span>
                      <span>{match.awayScore}</span>
                    </div>

                    {isLive && (
                      <div className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-rose-100">
                        <Radio className="h-4 w-4 text-rose-300" />
                        <span>{formatMatchMinute(match.matchMinute)}</span>
                      </div>
                    )}

                    {isFullTime && (
                      <div className="mt-3">
                        <Badge variant="secondary">Full Time</Badge>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <TeamPanel
              name={match.awayTeam?.name ?? match.awayPlaceholder ?? '—'}
              shortName={match.awayTeam?.shortName ?? match.awayPlaceholder ?? '—'}
              logo={match.awayTeam?.logo ?? null}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background px-4 py-2">
          <CalendarIcon className="h-4 w-4" />
          <span>{formatDate(match.matchDate)}</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background px-4 py-2">
          <Clock className="h-4 w-4" />
          <span>{formatTime(match.matchDate)}</span>
        </div>
        {match.venue && (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background px-4 py-2">
            <MapPin className="h-4 w-4" />
            <span>{match.venue}</span>
          </div>
        )}
        <Badge variant="secondary">{match.stage.replaceAll('_', ' ')}</Badge>
        {match.group && <Badge variant="outline">{match.group.name}</Badge>}
      </div>

      {timelineEvents.length > 0 && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/75">
                Match Story
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                Events timeline
              </h3>
            </div>

            <div className="space-y-3">
              {timelineEvents.map((event) => {
                const isHome = event.teamId === match.homeTeam?.id

                return (
                  <div
                    key={event.id}
                    className={cn('flex', isHome ? 'justify-start' : 'justify-end')}
                  >
                    <div
                      className={cn(
                        'flex max-w-[90%] items-center gap-3 rounded-[14px] border border-white/10 bg-background px-4 py-3',
                        !isHome && 'flex-row-reverse text-right'
                      )}
                    >
                      <div className="text-xs font-semibold tabular-nums text-primary">
                        {event.minute}&apos;
                      </div>
                      <EventBadge event={event} />
                      <div>
                        <p className="font-semibold text-foreground">
                          {event.playerName}
                          {event.isOwnGoal && (
                            <span className="ml-2 text-xs uppercase tracking-[0.18em] text-rose-200">
                              Own Goal
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          #{event.playerNumber}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lineup visualization */}
      {(() => {
        const homeLineup = match.lineups?.find((l) => l.teamId === match.homeTeam?.id) ?? null
        const awayLineup = match.lineups?.find((l) => l.teamId === match.awayTeam?.id) ?? null
        const homeKit = match.homeTeam?.kits?.[0] ?? null
        const awayKit = match.awayTeam?.kits?.[0] ?? null

        return (
          <LineupDisplay
            homeLineup={homeLineup}
            awayLineup={awayLineup}
            homeKit={homeKit}
            awayKit={awayKit}
            homeTeamName={match.homeTeam?.name ?? match.homePlaceholder ?? undefined}
            awayTeamName={match.awayTeam?.name ?? match.awayPlaceholder ?? undefined}
          />
        )
      })()}

      {/* Fan voting */}
      {match.homeTeam && match.awayTeam && (
        <VotePanel
          matchId={match.id}
          homeTeamName={match.homeTeam.name}
          awayTeamName={match.awayTeam.name}
          isFinished={match.status === 'FULL_TIME'}
        />
      )}

      {(match.homeTeam || match.awayTeam) && (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {match.homeTeam && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/75">
                Home Squad
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                {match.homeTeam.name}
              </h3>
            </div>
            <div className="space-y-2">
              {match.homeTeam.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-background px-3 py-3 text-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary font-semibold text-foreground">
                    #{player.number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{player.name}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {player.position}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}

        {match.awayTeam && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.28em] text-primary/75">
                Away Squad
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-foreground">
                {match.awayTeam.name}
              </h3>
            </div>
            <div className="space-y-2">
              {match.awayTeam.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-background px-3 py-3 text-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary font-semibold text-foreground">
                    #{player.number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{player.name}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {player.position}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}
      </div>
      )}
    </div>
  )
}
