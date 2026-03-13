'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { TeamSelectView } from './TeamSelectView'
import { PlayerSelectView } from './PlayerSelectView'
import { addGoal } from '../actions'

interface TeamData {
  id: string
  name: string
  shortName: string
  logo: string | null
  players: { id: string; name: string; number: number; position: string }[]
}

interface GoalStepsProps {
  matchId: string
  homeTeam: TeamData
  awayTeam: TeamData
  lineupPlayers: Record<string, { id: string; name: string; number: number; position: string }[]>
  onComplete: () => void
  onBack: () => void
}

export function GoalSteps({
  matchId,
  homeTeam,
  awayTeam,
  lineupPlayers,
  onComplete,
  onBack,
}: GoalStepsProps) {
  const [step, setStep] = useState<'team' | 'player'>('team')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [isOwnGoal, setIsOwnGoal] = useState(false)
  const [saving, setSaving] = useState(false)

  function handleTeamSelect(teamId: string) {
    setSelectedTeamId(teamId)
    setStep('player')
  }

  async function handlePlayerSelect(playerId: string) {
    setSaving(true)
    try {
      // For own goals: the benefiting team was selected, but we need the player's actual team
      const actualTeamId = isOwnGoal
        ? (selectedTeamId === homeTeam.id ? awayTeam.id : homeTeam.id)
        : selectedTeamId!

      await addGoal({
        matchId,
        teamId: actualTeamId,
        playerId,
        isOwnGoal,
      })
      toast.success('Goal added!')
      onComplete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add goal')
      setSaving(false)
    }
  }

  if (step === 'team') {
    return (
      <TeamSelectView
        title="Which team scored?"
        stepLabel="Goal — Step 1 of 2"
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onSelect={handleTeamSelect}
        onBack={onBack}
        showOwnGoalToggle
        isOwnGoal={isOwnGoal}
        onToggleOwnGoal={() => setIsOwnGoal(!isOwnGoal)}
      />
    )
  }

  // For own goals: show the OTHER team's players (the one who scored the OG)
  const playerTeamId = isOwnGoal
    ? (selectedTeamId === homeTeam.id ? awayTeam.id : homeTeam.id)
    : selectedTeamId!

  const teamForPlayers = playerTeamId === homeTeam.id ? homeTeam : awayTeam
  const players = lineupPlayers[playerTeamId]?.length > 0
    ? lineupPlayers[playerTeamId]
    : teamForPlayers.players

  return (
    <PlayerSelectView
      title="Which player?"
      stepLabel="Goal — Step 2 of 2"
      players={players}
      onSelect={handlePlayerSelect}
      onBack={() => setStep('team')}
      loading={saving}
    />
  )
}
