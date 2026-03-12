'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Minus, Plus } from 'lucide-react'
import { LiveScoreboard } from './LiveScoreboard'
import { LiveMinuteDisplay } from './LiveMinuteDisplay'
import { LiveTimeline } from './LiveTimeline'
import { GoalForm } from './GoalForm'
import { CardForm } from './CardForm'
import { MatchStatusControls } from './MatchStatusControls'
import {
  updateMatchMinute,
  addGoal,
  removeGoal,
  addCard,
  removeCard,
} from '../actions'
import type { MatchWithEvents } from '@/modules/matches/types'
import type { LiveEvent } from '../types'

interface LiveControlPanelProps {
  match: MatchWithEvents
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function LiveControlPanel({ match: initialMatch }: LiveControlPanelProps) {
  const { data: match, mutate } = useSWR<MatchWithEvents>(
    `/api/matches/${initialMatch.id}`,
    fetcher,
    {
      fallbackData: initialMatch,
      refreshInterval: 5000,
    }
  )

  const currentMatch = match ?? initialMatch

  const [minuteInput, setMinuteInput] = useState(currentMatch.matchMinute)

  const isLive = ['FIRST_HALF', 'HALF_TIME', 'SECOND_HALF'].includes(
    currentMatch.status
  )

  // Build live events for timeline
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

  const handleMinuteUpdate = useCallback(
    async (newMinute: number) => {
      const clamped = Math.max(0, Math.min(150, newMinute))
      setMinuteInput(clamped)
      try {
        await updateMatchMinute(currentMatch.id, clamped)
        mutate()
      } catch {
        toast.error('Failed to update minute')
      }
    },
    [currentMatch.id, mutate]
  )

  async function handleAddGoal(data: {
    matchId: string
    teamId: string
    playerId: string
    minute: number
    isOwnGoal: boolean
  }) {
    try {
      await addGoal(data)
      toast.success('Goal added')
      mutate()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add goal'
      )
    }
  }

  async function handleAddCard(data: {
    matchId: string
    teamId: string
    playerId: string
    type: 'YELLOW' | 'RED'
    minute: number
  }) {
    try {
      await addCard(data)
      toast.success('Card added')
      mutate()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add card'
      )
    }
  }

  async function handleDeleteEvent(eventId: string, type: 'goal' | 'card') {
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
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete event'
      )
    }
  }

  function handleStatusChange() {
    mutate()
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Scoreboard */}
      <Card>
        <CardContent className="p-4">
          <LiveScoreboard
            homeTeam={currentMatch.homeTeam}
            awayTeam={currentMatch.awayTeam}
            homeScore={currentMatch.homeScore}
            awayScore={currentMatch.awayScore}
            matchMinute={currentMatch.matchMinute}
            status={currentMatch.status}
          />
        </CardContent>
      </Card>

      {/* Minute display */}
      <Card>
        <CardContent className="p-4">
          <LiveMinuteDisplay
            minute={currentMatch.matchMinute}
            isLive={isLive}
          />
        </CardContent>
      </Card>

      {/* Status controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Match Control</CardTitle>
        </CardHeader>
        <CardContent>
          <MatchStatusControls
            matchId={currentMatch.id}
            status={currentMatch.status}
            onStatusChange={handleStatusChange}
          />
        </CardContent>
      </Card>

      {/* Minute control */}
      {isLive && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Match Minute</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => handleMinuteUpdate(minuteInput - 1)}
              >
                <Minus className="h-5 w-5" />
              </Button>
              <Input
                type="number"
                min={0}
                max={150}
                value={minuteInput}
                onChange={(e) => setMinuteInput(parseInt(e.target.value) || 0)}
                className="h-12 text-center text-lg font-bold"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => handleMinuteUpdate(minuteInput + 1)}
              >
                <Plus className="h-5 w-5" />
              </Button>
              <Button
                className="h-12"
                onClick={() => handleMinuteUpdate(minuteInput)}
              >
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event entry (Goal / Card tabs) */}
      {isLive && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Event</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="goal">
              <TabsList className="w-full">
                <TabsTrigger value="goal" className="flex-1">
                  Goal
                </TabsTrigger>
                <TabsTrigger value="card" className="flex-1">
                  Card
                </TabsTrigger>
              </TabsList>
              <TabsContent value="goal" className="mt-4">
                <GoalForm
                  matchId={currentMatch.id}
                  homeTeam={currentMatch.homeTeam}
                  awayTeam={currentMatch.awayTeam}
                  currentMinute={currentMatch.matchMinute}
                  onSubmit={handleAddGoal}
                />
              </TabsContent>
              <TabsContent value="card" className="mt-4">
                <CardForm
                  matchId={currentMatch.id}
                  homeTeam={currentMatch.homeTeam}
                  awayTeam={currentMatch.awayTeam}
                  currentMinute={currentMatch.matchMinute}
                  onSubmit={handleAddCard}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Event timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Match Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <LiveTimeline
            events={events}
            onDelete={handleDeleteEvent}
          />
        </CardContent>
      </Card>
    </div>
  )
}
