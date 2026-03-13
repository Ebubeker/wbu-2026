'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { TeamSelectView } from './TeamSelectView'
import { PlayerSelectView } from './PlayerSelectView'
import { addCard } from '../actions'

interface TeamData {
  id: string
  name: string
  shortName: string
  logo: string | null
  players: { id: string; name: string; number: number; position: string }[]
}

interface CardStepsProps {
  matchId: string
  homeTeam: TeamData
  awayTeam: TeamData
  lineupPlayers: Record<string, { id: string; name: string; number: number; position: string }[]>
  onComplete: () => void
  onBack: () => void
}

export function CardSteps({
  matchId,
  homeTeam,
  awayTeam,
  lineupPlayers,
  onComplete,
  onBack,
}: CardStepsProps) {
  const [step, setStep] = useState<'type' | 'team' | 'player'>('type')
  const [cardType, setCardType] = useState<'YELLOW' | 'RED' | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function handleTypeSelect(type: 'YELLOW' | 'RED') {
    setCardType(type)
    setStep('team')
  }

  function handleTeamSelect(teamId: string) {
    setSelectedTeamId(teamId)
    setStep('player')
  }

  async function handlePlayerSelect(playerId: string) {
    setSaving(true)
    try {
      await addCard({
        matchId,
        teamId: selectedTeamId!,
        playerId,
        type: cardType!,
      })
      toast.success(`${cardType === 'YELLOW' ? 'Yellow' : 'Red'} card added!`)
      onComplete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add card')
      setSaving(false)
    }
  }

  if (step === 'type') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button onClick={onBack} className="rounded-lg p-2 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs text-muted-foreground">Card — Step 1 of 3</p>
            <h2 className="text-lg font-semibold">Card Type</h2>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <button
            onClick={() => handleTypeSelect('YELLOW')}
            className="flex flex-1 items-center justify-center rounded-2xl bg-yellow-500 text-black text-2xl font-bold transition-colors hover:bg-yellow-400 active:bg-yellow-600"
          >
            <div className="text-center">
              <div className="text-5xl mb-2">🟨</div>
              <div>Yellow Card</div>
            </div>
          </button>

          <button
            onClick={() => handleTypeSelect('RED')}
            className="flex flex-1 items-center justify-center rounded-2xl bg-red-600 text-white text-2xl font-bold transition-colors hover:bg-red-500 active:bg-red-700"
          >
            <div className="text-center">
              <div className="text-5xl mb-2">🟥</div>
              <div>Red Card</div>
            </div>
          </button>
        </div>
      </div>
    )
  }

  if (step === 'team') {
    return (
      <TeamSelectView
        title="Which team?"
        stepLabel="Card — Step 2 of 3"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSelect={handleTeamSelect}
        onBack={() => setStep('type')}
      />
    )
  }

  const teamForPlayers = selectedTeamId === homeTeam.id ? homeTeam : awayTeam
  const players = lineupPlayers[selectedTeamId!]?.length > 0
    ? lineupPlayers[selectedTeamId!]
    : teamForPlayers.players

  return (
    <PlayerSelectView
      title="Which player?"
      stepLabel="Card — Step 3 of 3"
      players={players}
      onSelect={handlePlayerSelect}
      onBack={() => setStep('team')}
      loading={saving}
    />
  )
}
