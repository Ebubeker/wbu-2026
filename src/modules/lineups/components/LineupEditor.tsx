'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, RotateCcw, Save } from 'lucide-react'
import { PitchView } from './PitchView'
import { FORMATIONS, FORMATION_LABELS } from '@/lib/formations'
import type { Formation } from '@/lib/formations'
import type { LineupData } from '../types'

interface SquadPlayer {
  id: string
  name: string
  number: number
  position: string
}

interface LineupEditorProps {
  matchId: string
  teamId: string
  squad: SquadPlayer[]
  existingLineup: LineupData | null
  isLocked: boolean
  kitColors?: { primaryColor: string; secondaryColor: string } | null
}

interface SlotAssignment {
  playerId: string
  positionSlot: number
}

export function LineupEditor({
  matchId,
  teamId,
  squad,
  existingLineup,
  isLocked,
  kitColors,
}: LineupEditorProps) {
  const [formation, setFormation] = useState<Formation>(
    (existingLineup?.formation as Formation) ?? '1-2-2-1'
  )
  const [assignments, setAssignments] = useState<SlotAssignment[]>(
    existingLineup?.players.map((p) => ({
      playerId: p.playerId,
      positionSlot: p.positionSlot,
    })) ?? []
  )
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const assignedPlayerIds = assignments.map((a) => a.playerId)
  const availablePlayers = squad.filter((p) => !assignedPlayerIds.includes(p.id))

  function handleSlotClick(slot: number) {
    if (isLocked) return
    // If slot already has a player, remove them
    const existing = assignments.find((a) => a.positionSlot === slot)
    if (existing) {
      setAssignments(assignments.filter((a) => a.positionSlot !== slot))
      return
    }
    setSelectedSlot(slot)
  }

  function handlePlayerClick(playerId: string) {
    if (isLocked || selectedSlot === null) return
    setAssignments([...assignments.filter((a) => a.positionSlot !== selectedSlot), { playerId, positionSlot: selectedSlot }])
    setSelectedSlot(null)
  }

  function handleReset() {
    setAssignments([])
    setSelectedSlot(null)
  }

  async function handleSave() {
    if (assignments.length !== 6) {
      toast.error('You must assign all 6 positions')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/lineup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formation, players: assignments }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      toast.success('Lineup saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save lineup')
    } finally {
      setSaving(false)
    }
  }

  const pitchPlayers = assignments.map((a) => {
    const player = squad.find((p) => p.id === a.playerId)
    return {
      name: player?.name ?? '?',
      number: player?.number ?? 0,
      positionSlot: a.positionSlot,
    }
  })

  if (isLocked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Lineup Locked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            The lineup is locked because the match has started.
          </p>
          <Badge variant="outline" className="mb-3">{formation}</Badge>
          <PitchView
            formation={formation}
            players={pitchPlayers}
            primaryColor={kitColors?.primaryColor}
            secondaryColor={kitColors?.secondaryColor}
            side="left"
            className="aspect-[2/3] max-w-sm mx-auto"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* Pitch preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formation & Positions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formation selector */}
          <div className="flex flex-wrap gap-2">
            {FORMATIONS.map((f) => (
              <Button
                key={f}
                variant={formation === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFormation(f)
                  setAssignments([])
                  setSelectedSlot(null)
                }}
              >
                {f}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{FORMATION_LABELS[formation]}</p>

          {/* Pitch */}
          <div className="relative">
            <PitchView
              formation={formation}
              players={pitchPlayers}
              primaryColor={kitColors?.primaryColor}
              secondaryColor={kitColors?.secondaryColor}
              side="left"
              className="aspect-[2/3] max-w-sm mx-auto"
              onSlotClick={handleSlotClick}
              selectedSlot={selectedSlot}
            />
            {selectedSlot !== null && (
              <p className="text-center text-sm text-primary mt-2">
                Select a player from the squad to fill slot {selectedSlot}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || assignments.length !== 6}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : 'Save Lineup'}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {assignments.length}/6 positions filled. Click a position on the pitch to assign/remove a player.
          </p>
        </CardContent>
      </Card>

      {/* Squad list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Squad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 max-h-[500px] overflow-y-auto">
          {availablePlayers.length === 0 && assignments.length === 6 ? (
            <p className="text-sm text-muted-foreground">All positions filled</p>
          ) : selectedSlot === null ? (
            <p className="text-sm text-muted-foreground">Click a position on the pitch first</p>
          ) : null}
          {availablePlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => handlePlayerClick(player.id)}
              disabled={selectedSlot === null}
              className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary font-semibold text-xs">
                #{player.number}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{player.name}</p>
                <p className="text-xs text-muted-foreground">{player.position}</p>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
