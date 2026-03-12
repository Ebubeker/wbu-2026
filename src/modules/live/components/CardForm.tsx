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
import { cn } from '@/lib/utils'

interface TeamWithPlayers {
  id: string
  name: string
  shortName: string
  logo: string | null
  players: Array<{ id: string; name: string; number: number; position: string }>
}

interface CardFormProps {
  matchId: string
  homeTeam: TeamWithPlayers
  awayTeam: TeamWithPlayers
  currentMinute: number
  onSubmit: (data: {
    matchId: string
    teamId: string
    playerId: string
    type: 'YELLOW' | 'RED'
    minute: number
  }) => Promise<void>
}

export function CardForm({
  matchId,
  homeTeam,
  awayTeam,
  currentMinute,
  onSubmit,
}: CardFormProps) {
  const [selectedTeamId, setSelectedTeamId] = useState(homeTeam.id)
  const [playerId, setPlayerId] = useState('')
  const [cardType, setCardType] = useState<'YELLOW' | 'RED'>('YELLOW')
  const [minute, setMinute] = useState(currentMinute)
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
        type: cardType,
        minute,
      })
      // Reset form
      setPlayerId('')
      setCardType('YELLOW')
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
        <Label htmlFor="card-player">Player</Label>
        <Select value={playerId} onValueChange={setPlayerId}>
          <SelectTrigger id="card-player">
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

      {/* Card type */}
      <div className="space-y-2">
        <Label>Card Type</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={cardType === 'YELLOW' ? 'default' : 'outline'}
            className={cn(
              'h-12',
              cardType === 'YELLOW' && 'bg-yellow-500 hover:bg-yellow-600 text-black'
            )}
            onClick={() => setCardType('YELLOW')}
          >
            {'\uD83D\uDFE8'} Yellow
          </Button>
          <Button
            type="button"
            variant={cardType === 'RED' ? 'default' : 'outline'}
            className={cn(
              'h-12',
              cardType === 'RED' && 'bg-red-600 hover:bg-red-700 text-white'
            )}
            onClick={() => setCardType('RED')}
          >
            {'\uD83D\uDFE5'} Red
          </Button>
        </div>
      </div>

      {/* Minute */}
      <div className="space-y-2">
        <Label htmlFor="card-minute">Minute</Label>
        <Input
          id="card-minute"
          type="number"
          min={0}
          max={150}
          value={minute}
          onChange={(e) => setMinute(parseInt(e.target.value) || 0)}
        />
      </div>

      <Button
        type="submit"
        className="w-full h-12"
        disabled={!playerId || submitting}
      >
        {submitting ? 'Adding...' : 'Add Card'}
      </Button>
    </form>
  )
}
