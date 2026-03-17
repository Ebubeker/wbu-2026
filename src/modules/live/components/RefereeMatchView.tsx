'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Play, Pause, Square, RotateCcw, Timer, TimerOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { MatchTimer } from './MatchTimer'
import { ActionChoiceView } from './ActionChoiceView'
import { GoalSteps } from './GoalSteps'
import { CardSteps } from './CardSteps'
import { RefereeTimeline } from './RefereeTimeline'
import {
  updateMatchStatus,
  pauseTimer,
  resumeTimer,
  removeGoal,
  removeCard,
} from '../actions'
import type { MatchWithEvents } from '@/modules/matches/types'
import type { LiveEvent } from '../types'

interface RefereeMatchViewProps {
  match: MatchWithEvents
}

type View = 'main' | 'action' | 'goal' | 'card'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function RefereeMatchView({ match: initialMatch }: RefereeMatchViewProps) {
  const { data: match, mutate } = useSWR<MatchWithEvents>(
    `/api/matches/${initialMatch.id}`,
    fetcher,
    { fallbackData: initialMatch, refreshInterval: 5000 }
  )

  const currentMatch = match ?? initialMatch
  const [view, setView] = useState<View>('main')
  const [loading, setLoading] = useState(false)
  const [confirmFullTime, setConfirmFullTime] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(false)

  const isLive = ['FIRST_HALF', 'HALF_TIME', 'SECOND_HALF'].includes(currentMatch.status)
  const isPaused = !!currentMatch.timerPausedAt

  // Build events for timeline
  const events: LiveEvent[] = [
    ...currentMatch.goals.map((g) => ({
      id: g.id,
      type: 'goal' as const,
      minute: g.minute,
      playerName: g.player.name,
      playerNumber: g.player.number,
      teamName: g.team.name,
      teamId: g.team.id,
      isOwnGoal: g.isOwnGoal,
      assistPlayerName: g.assistPlayer?.name ?? null,
      assistPlayerNumber: g.assistPlayer?.number ?? null,
    })),
    ...currentMatch.cards.map((c) => ({
      id: c.id,
      type: 'card' as const,
      minute: c.minute,
      playerName: c.player.name,
      playerNumber: c.player.number,
      teamName: c.team.name,
      teamId: c.team.id,
      cardType: c.type,
    })),
  ]

  // Build lineup players map
  const lineupPlayers: Record<string, { id: string; name: string; number: number; position: string }[]> = {}
  for (const lineup of currentMatch.lineups ?? []) {
    lineupPlayers[lineup.teamId] = lineup.players?.map((lp: { player: { id: string; name: string; number: number; position: string } }) => lp.player) ?? []
  }

  const homeTeam = currentMatch.homeTeam!
  const awayTeam = currentMatch.awayTeam!

  const homeTeamData = {
    id: homeTeam.id,
    name: homeTeam.name,
    shortName: homeTeam.shortName,
    logo: homeTeam.logo ?? null,
    players: homeTeam.players?.map((p: { id: string; name: string; number: number; position: string }) => ({
      id: p.id, name: p.name, number: p.number, position: p.position,
    })) ?? [],
  }

  const awayTeamData = {
    id: awayTeam.id,
    name: awayTeam.name,
    shortName: awayTeam.shortName,
    logo: awayTeam.logo ?? null,
    players: awayTeam.players?.map((p: { id: string; name: string; number: number; position: string }) => ({
      id: p.id, name: p.name, number: p.number, position: p.position,
    })) ?? [],
  }

  async function handleStatusChange(newStatus: string) {
    setLoading(true)
    try {
      await updateMatchStatus(currentMatch.id, newStatus)
      toast.success(`Match status: ${newStatus.replace('_', ' ')}`)
      mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  async function handlePauseResume() {
    try {
      if (isPaused) {
        await resumeTimer(currentMatch.id)
      } else {
        await pauseTimer(currentMatch.id)
      }
      mutate()
    } catch {
      toast.error('Failed to update timer')
    }
  }

  const handleDeleteEvent = useCallback(async (eventId: string, type: 'goal' | 'card') => {
    try {
      if (type === 'goal') {
        await removeGoal(eventId)
        toast.success('Goal removed')
      } else {
        await removeCard(eventId)
        toast.success('Card removed')
      }
      mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete event')
    }
  }, [mutate])

  function handleActionComplete() {
    setView('main')
    mutate()
  }

  // Render sub-views
  if (view === 'action') {
    return (
      <ActionChoiceView
        onSelectGoal={() => setView('goal')}
        onSelectCard={() => setView('card')}
        onBack={() => setView('main')}
      />
    )
  }

  if (view === 'goal') {
    return (
      <GoalSteps
        matchId={currentMatch.id}
        homeTeam={homeTeamData}
        awayTeam={awayTeamData}
        lineupPlayers={lineupPlayers}
        onComplete={handleActionComplete}
        onBack={() => setView('action')}
      />
    )
  }

  if (view === 'card') {
    return (
      <CardSteps
        matchId={currentMatch.id}
        homeTeam={homeTeamData}
        awayTeam={awayTeamData}
        lineupPlayers={lineupPlayers}
        onComplete={handleActionComplete}
        onBack={() => setView('action')}
      />
    )
  }

  // Main view
  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      {/* Timer (only when live) */}
      {isLive && currentMatch.status !== 'HALF_TIME' && (
        <MatchTimer
          status={currentMatch.status}
          timerStartedAt={currentMatch.timerStartedAt as string | null}
          timerPausedAt={currentMatch.timerPausedAt as string | null}
          pausedElapsed={(currentMatch.pausedElapsed as number) ?? 0}
        />
      )}

      {/* Status badge */}
      <div className="text-center">
        <span className={`inline-block rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wider ${
          currentMatch.status === 'FULL_TIME' ? 'bg-muted text-muted-foreground' :
          currentMatch.status === 'HALF_TIME' ? 'bg-yellow-500/20 text-yellow-400' :
          isLive ? 'bg-emerald-500/20 text-emerald-400' :
          'bg-muted text-muted-foreground'
        }`}>
          {currentMatch.status.replace('_', ' ')}
        </span>
      </div>

      {/* Scoreboard */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-6">
        <div className="flex-1 text-center">
          {homeTeam.logo ? (
            <img src={homeTeam.logo} alt={homeTeam.name} className="mx-auto h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xs font-bold">{homeTeam.shortName}</div>
          )}
          <p className="mt-2 truncate text-sm font-medium">{homeTeam.name}</p>
        </div>

        <div className="px-4 text-center">
          <p className="text-4xl font-bold tabular-nums">
            {currentMatch.homeScore} — {currentMatch.awayScore}
          </p>
        </div>

        <div className="flex-1 text-center">
          {awayTeam.logo ? (
            <img src={awayTeam.logo} alt={awayTeam.name} className="mx-auto h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xs font-bold">{awayTeam.shortName}</div>
          )}
          <p className="mt-2 truncate text-sm font-medium">{awayTeam.name}</p>
        </div>
      </div>

      {/* SCHEDULED: Start Match */}
      {currentMatch.status === 'SCHEDULED' && (
        <Button
          className="h-16 w-full rounded-2xl bg-emerald-600 text-xl font-bold text-white hover:bg-emerald-700"
          onClick={() => handleStatusChange('FIRST_HALF')}
          disabled={loading}
        >
          <Play className="mr-2 h-6 w-6" />
          Start Match
        </Button>
      )}

      {/* LIVE: Action button */}
      {isLive && currentMatch.status !== 'HALF_TIME' && (
        <Button
          className="h-16 w-full rounded-2xl bg-primary text-xl font-bold hover:bg-primary/90"
          onClick={() => setView('action')}
        >
          ACTION
        </Button>
      )}

      {/* Status transitions */}
      {currentMatch.status === 'FIRST_HALF' && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-xl"
            onClick={() => handleStatusChange('HALF_TIME')}
            disabled={loading}
          >
            <Pause className="mr-2 h-4 w-4" />
            Half Time
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl"
            onClick={handlePauseResume}
          >
            {isPaused ? <Timer className="h-4 w-4" /> : <TimerOff className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {currentMatch.status === 'HALF_TIME' && (
        <Button
          className="h-14 w-full rounded-2xl bg-emerald-600 text-lg font-bold text-white hover:bg-emerald-700"
          onClick={() => handleStatusChange('SECOND_HALF')}
          disabled={loading}
        >
          <Play className="mr-2 h-5 w-5" />
          Start 2nd Half
        </Button>
      )}

      {currentMatch.status === 'SECOND_HALF' && (
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="h-12 flex-1 rounded-xl"
            onClick={() => setConfirmFullTime(true)}
            disabled={loading}
          >
            <Square className="mr-2 h-4 w-4" />
            Full Time
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl"
            onClick={handlePauseResume}
          >
            {isPaused ? <Timer className="h-4 w-4" /> : <TimerOff className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {currentMatch.status === 'FULL_TIME' && (
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-muted-foreground">Match Ended</p>
          <Button
            variant="outline"
            className="h-12 w-full rounded-xl"
            onClick={() => setConfirmReopen(true)}
            disabled={loading}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reopen Match
          </Button>
        </div>
      )}

      {/* Event Timeline */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Match Events
        </h3>
        <RefereeTimeline
          events={events}
          onDelete={handleDeleteEvent}
          readOnly={currentMatch.status === 'FULL_TIME'}
        />
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmFullTime}
        onOpenChange={setConfirmFullTime}
        title="End Match"
        description="Are you sure you want to end this match?"
        confirmText="End Match"
        variant="destructive"
        onConfirm={() => {
          setConfirmFullTime(false)
          handleStatusChange('FULL_TIME')
        }}
      />

      <ConfirmDialog
        open={confirmReopen}
        onOpenChange={setConfirmReopen}
        title="Reopen Match"
        description="Are you sure you want to reopen this match?"
        confirmText="Reopen"
        variant="default"
        onConfirm={() => {
          setConfirmReopen(false)
          handleStatusChange('SECOND_HALF')
        }}
      />
    </div>
  )
}
