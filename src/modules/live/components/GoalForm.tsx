'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface TeamWithPlayers {
  id: string
  name: string
  shortName: string
  logo: string | null
  players: Array<{ id: string; name: string; number: number; position: string }>
}

interface GoalFormProps {
  matchId: string
  homeTeam: TeamWithPlayers
  awayTeam: TeamWithPlayers
  currentMinute: number
  onSubmit: (data: {
    matchId: string
    teamId: string
    playerId: string
    minute: number
    isOwnGoal: boolean
  }) => Promise<void>
}

export function GoalForm({
  matchId,
  homeTeam,
  awayTeam,
  currentMinute,
  onSubmit,
}: GoalFormProps) {
  const [selectedTeamId, setSelectedTeamId] = useState(homeTeam.id)
  const [playerId, setPlayerId] = useState('')
  const [minute, setMinute] = useState(currentMinute)
  const [isOwnGoal, setIsOwnGoal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const selectedTeam = selectedTeamId === homeTeam.id ? homeTeam : awayTeam
  const players = selectedTeam.players

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!playerId) return

    setSubmitting(true)
    try {
      await onSubmit({
        matchId,
        teamId: selectedTeamId,
        playerId,
        minute,
        isOwnGoal,
      })
      // Reset form
      setPlayerId('')
      setIsOwnGoal(false)
      setMinute(currentMinute)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Team selection */}
      <div className="space-y-2">
        <Label>Team</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={selectedTeamId === homeTeam.id ? 'default' : 'outline'}
            className={cn('h-12', selectedTeamId === homeTeam.id && 'ring-2 ring-primary')}
            onClick={() => {
              setSelectedTeamId(homeTeam.id)
              setPlayerId('')
            }}
          >
            {homeTeam.name}
          </Button>
          <Button
            type="button"
            variant={selectedTeamId === awayTeam.id ? 'default' : 'outline'}
            className={cn('h-12', selectedTeamId === awayTeam.id && 'ring-2 ring-primary')}
            onClick={() => {
              setSelectedTeamId(awayTeam.id)
              setPlayerId('')
            }}
          >
            {awayTeam.name}
          </Button>
        </div>
      </div>

      {/* Player select */}
      <div className="space-y-2">
        <Label htmlFor="goal-player">Player</Label>
        <Select value={playerId} onValueChange={setPlayerId}>
          <SelectTrigger id="goal-player">
            <SelectValue placeholder="Select player" />
          </SelectTrigger>
          <SelectContent>
            {players.map((player) => (
              <SelectItem key={player.id} value={player.id}>
                #{player.number} {player.name} ({player.position})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Minute */}
      <div className="space-y-2">
        <Label htmlFor="goal-minute">Minute</Label>
        <Input
          id="goal-minute"
          type="number"
          min={0}
          max={150}
          value={minute}
          onChange={(e) => setMinute(parseInt(e.target.value) || 0)}
        />
      </div>

      {/* Own Goal */}
      <div className="flex items-center justify-between">
        <Label htmlFor="own-goal">Own Goal</Label>
        <Switch
          id="own-goal"
          checked={isOwnGoal}
          onCheckedChange={setIsOwnGoal}
        />
      </div>

      <Button
        type="submit"
        className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
        disabled={!playerId || submitting}
      >
        {submitting ? 'Adding...' : 'Add Goal \u26BD'}
      </Button>
    </form>
  )
}
