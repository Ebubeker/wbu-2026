'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { formatDate, formatTime, formatMatchMinute } from '@/lib/utils'
import { Calendar as CalendarIcon, Clock, MapPin, Radio } from 'lucide-react'
import { SSE_RETRY_INTERVAL } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { LineupDisplay } from '@/modules/lineups/components/LineupDisplay'
import { VotePanel } from '@/modules/voting/components/VotePanel'
import { MotmPanel } from '@/modules/voting/components/MotmPanel'
import { LiveMinute } from './LiveMinute'
import type { MatchWithEvents } from '../types'

interface MatchDetailProps {
  match: MatchWithEvents
}

type TimelineEvent = {
  id: string
  minute: number
  type: 'goal' | 'card'
  teamId: string
  playerId: string
  playerName: string
  playerNumber: number
  isOwnGoal?: boolean
  cardType?: 'YELLOW' | 'RED'
}

function EventIcon({ event }: { event: TimelineEvent }) {
  if (event.type === 'goal') {
    return <span className="text-base sm:text-lg" title="Goal">⚽</span>
  }

  if (event.cardType === 'YELLOW') {
    return <span className="text-base sm:text-lg" title="Yellow card">🟨</span>
  }

  return <span className="text-base sm:text-lg" title="Red card">🟥</span>
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
    <div className="flex flex-col items-center gap-2 text-center sm:gap-3">
      <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-border/60 bg-muted/30 p-2.5 sm:h-24 sm:w-24 sm:rounded-[20px] sm:p-3">
        {logo ? (
          <img
            src={logo}
            alt={name}
            className="absolute inset-0 h-full w-full object-contain p-2.5 sm:p-3"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-base font-semibold text-foreground sm:text-lg">
            {shortName}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground sm:text-lg">{name}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:mt-1 sm:text-xs">
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
      playerId: goal.player.id,
      playerName: goal.player.name,
      playerNumber: goal.player.number,
      isOwnGoal: goal.isOwnGoal,
    })),
    ...match.cards.map((card) => ({
      id: card.id,
      minute: card.minute,
      type: 'card' as const,
      teamId: card.team.id,
      playerId: card.player.id,
      playerName: card.player.name,
      playerNumber: card.player.number,
      cardType: card.type,
    })),
  ].sort((a, b) => a.minute - b.minute)

  useEffect(() => {
    if (!isLive) return

    let eventSource: EventSource | null = null
    let fallbackPollInterval: ReturnType<typeof setInterval> | null = null

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

    // Always poll every 60s to keep timeline, scores, etc. fresh
    const periodicRefresh = setInterval(refreshMatch, 60_000)

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
          timerStartedAt: data.timerStartedAt ?? previous.timerStartedAt,
          timerPausedAt: data.timerPausedAt ?? previous.timerPausedAt,
          pausedElapsed: data.pausedElapsed ?? previous.pausedElapsed,
        }))
      })

      eventSource.addEventListener('timer_start', refreshMatch)
      eventSource.addEventListener('timer_pause', refreshMatch)
      eventSource.addEventListener('timer_resume', refreshMatch)

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

        // Faster fallback polling when SSE drops
        if (!fallbackPollInterval) {
          fallbackPollInterval = setInterval(refreshMatch, SSE_RETRY_INTERVAL)
        }
      }
    }

    connectSSE()

    return () => {
      eventSource?.close()
      clearInterval(periodicRefresh)
      if (fallbackPollInterval) clearInterval(fallbackPollInterval)
    }
  }, [match.id, isLive])

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="px-4 py-5 sm:p-8">
          {/* Status badge */}
          <div className="mb-4 flex justify-center sm:mb-6">
            <StatusBadge status={match.status} />
          </div>

          {/* Teams + Score — always horizontal */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
            <TeamPanel
              name={match.homeTeam?.name ?? match.homePlaceholder ?? '—'}
              shortName={match.homeTeam?.shortName ?? match.homePlaceholder ?? '—'}
              logo={match.homeTeam?.logo ?? null}
            />

            <div className="text-center">
              {isScheduled ? (
                <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 sm:rounded-[20px] sm:px-6 sm:py-5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground sm:text-xs">
                    Kick-off
                  </p>
                  <p className="mt-1 text-2xl font-bold text-foreground sm:mt-2 sm:text-4xl">
                    {formatTime(match.matchDate)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground sm:mt-2 sm:text-sm">
                    {formatDate(match.matchDate)}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3 sm:rounded-[20px] sm:px-6 sm:py-5">
                  <div className="flex items-center justify-center gap-2 text-3xl font-bold tabular-nums text-foreground sm:gap-3 sm:text-6xl">
                    <span>{match.homeScore}</span>
                    <span className="text-muted-foreground/50">:</span>
                    <span>{match.awayScore}</span>
                  </div>

                  {isLive && (
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-rose-600 sm:mt-3 sm:gap-2 sm:text-sm">
                      <Radio className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>
                        <LiveMinute
                          status={match.status}
                          timerStartedAt={match.timerStartedAt}
                          timerPausedAt={match.timerPausedAt}
                          pausedElapsed={match.pausedElapsed}
                        />
                      </span>
                    </div>
                  )}

                  {isFullTime && (
                    <p className="mt-2 text-xs font-medium uppercase tracking-wider text-emerald-600 sm:mt-3 sm:text-sm">
                      Full Time
                    </p>
                  )}
                </div>
              )}
            </div>

            <TeamPanel
              name={match.awayTeam?.name ?? match.awayPlaceholder ?? '—'}
              shortName={match.awayTeam?.shortName ?? match.awayPlaceholder ?? '—'}
              logo={match.awayTeam?.logo ?? null}
            />
          </div>

          {/* Match info pills — inside the card */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:mt-6">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground sm:gap-2 sm:px-4 sm:py-2 sm:text-sm">
              <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{formatDate(match.matchDate)}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground sm:gap-2 sm:px-4 sm:py-2 sm:text-sm">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{formatTime(match.matchDate)}</span>
            </div>
            {match.venue && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground sm:gap-2 sm:px-4 sm:py-2 sm:text-sm">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{match.venue}</span>
              </div>
            )}
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{match.stage.replaceAll('_', ' ')}</span>
            {match.group && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-xs font-medium text-muted-foreground">{match.group.name}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {timelineEvents.length > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="mb-3 sm:mb-4">
              <p className="text-[10px] uppercase tracking-[0.28em] text-primary/75 sm:text-xs">
                Match Story
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground sm:mt-2 sm:text-2xl">
                Events timeline
              </h3>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {timelineEvents.map((event) => {
                const isHome = event.teamId === match.homeTeam?.id

                return (
                  <div
                    key={event.id}
                    className={cn('flex', isHome ? 'justify-start' : 'justify-end')}
                  >
                    <div
                      className={cn(
                        'flex max-w-[85%] items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 sm:max-w-[90%] sm:gap-3 sm:rounded-[14px] sm:px-4 sm:py-3',
                        !isHome && 'flex-row-reverse text-right'
                      )}
                    >
                      <div className="text-xs font-semibold tabular-nums text-primary">
                        {event.minute}&apos;
                      </div>
                      <EventIcon event={event} />
                      <div className="min-w-0">
                        <Link href={`/players/${event.playerId}`} className="truncate text-sm font-semibold text-foreground hover:text-primary sm:text-base">
                          {event.playerName}
                          {event.isOwnGoal && (
                            <span className="ml-1.5 text-[10px] uppercase tracking-[0.18em] text-rose-500 sm:ml-2 sm:text-xs">
                              OG
                            </span>
                          )}
                        </Link>
                        <p className="text-xs text-muted-foreground sm:text-sm">
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
        <>
          <VotePanel
            matchId={match.id}
            homeTeamName={match.homeTeam.name}
            awayTeamName={match.awayTeam.name}
            isFinished={match.status === 'FULL_TIME'}
            homeScore={match.homeScore}
            awayScore={match.awayScore}
          />

          {isFullTime && (
            <MotmPanel
              matchId={match.id}
              players={[
                ...match.homeTeam.players.map((p) => ({
                  id: p.id,
                  name: p.name,
                  number: p.number,
                  teamName: match.homeTeam!.name,
                  teamId: match.homeTeam!.id,
                })),
                ...match.awayTeam.players.map((p) => ({
                  id: p.id,
                  name: p.name,
                  number: p.number,
                  teamName: match.awayTeam!.name,
                  teamId: match.awayTeam!.id,
                })),
              ]}
            />
          )}
        </>
      )}

      {(match.homeTeam || match.awayTeam) && (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {match.homeTeam && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="mb-3 sm:mb-4">
              <p className="text-[10px] uppercase tracking-[0.28em] text-primary/75 sm:text-xs">
                Home Squad
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground sm:mt-2 sm:text-2xl">
                {match.homeTeam.name}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1 sm:gap-2">
              {match.homeTeam.players.map((player) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-2.5 py-2 text-sm transition-colors hover:bg-muted/60 sm:gap-3 sm:rounded-2xl sm:px-3 sm:py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-foreground sm:h-10 sm:w-10 sm:rounded-2xl sm:text-sm">
                    #{player.number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground sm:text-sm">{player.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
                      {player.position}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
        )}

        {match.awayTeam && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="mb-3 sm:mb-4">
              <p className="text-[10px] uppercase tracking-[0.28em] text-primary/75 sm:text-xs">
                Away Squad
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground sm:mt-2 sm:text-2xl">
                {match.awayTeam.name}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1 sm:gap-2">
              {match.awayTeam.players.map((player) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-2.5 py-2 text-sm transition-colors hover:bg-muted/60 sm:gap-3 sm:rounded-2xl sm:px-3 sm:py-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-foreground sm:h-10 sm:w-10 sm:rounded-2xl sm:text-sm">
                    #{player.number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground sm:text-sm">{player.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
                      {player.position}
                    </p>
                  </div>
                </Link>
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
