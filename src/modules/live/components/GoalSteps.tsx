'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
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
  const [step, setStep] = useState<'team' | 'player' | 'assist'>('team')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [isOwnGoal, setIsOwnGoal] = useState(false)
  const [saving, setSaving] = useState(false)

  function handleTeamSelect(teamId: string) {
    setSelectedTeamId(teamId)
    setStep('player')
  }

  function handlePlayerSelect(playerId: string) {
    setSelectedPlayerId(playerId)
    if (isOwnGoal) {
      // No assist for own goals, save directly
      saveGoal(playerId, null)
    } else {
      setStep('assist')
    }
  }

  async function saveGoal(playerId: string, assistPlayerId: string | null) {
    setSaving(true)
    try {
      const actualTeamId = isOwnGoal
        ? (selectedTeamId === homeTeam.id ? awayTeam.id : homeTeam.id)
        : selectedTeamId!

      await addGoal({
        matchId,
        teamId: actualTeamId,
        playerId,
        assistPlayerId,
        isOwnGoal,
      })
      toast.success('Goal added!')
      onComplete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add goal')
      setSaving(false)
    }
  }

  function handleAssistSelect(assistPlayerId: string) {
    saveGoal(selectedPlayerId!, assistPlayerId)
  }

  function handleNoAssist() {
    saveGoal(selectedPlayerId!, null)
  }

  if (step === 'team') {
    return (
      <TeamSelectView
        title="Which team scored?"
        stepLabel="Goal — Step 1 of 3"
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
  const lineupIds = new Set(lineupPlayers[playerTeamId]?.map((p) => p.id) ?? [])
  const players = [...teamForPlayers.players].sort((a, b) => {
    const aInLineup = lineupIds.has(a.id) ? 0 : 1
    const bInLineup = lineupIds.has(b.id) ? 0 : 1
    return aInLineup - bInLineup || a.number - b.number
  })

  if (step === 'player') {
    return (
      <PlayerSelectView
        title="Who scored?"
        stepLabel="Goal — Step 2 of 3"
        players={players}
        lineupIds={lineupIds}
        onSelect={handlePlayerSelect}
        onBack={() => setStep('team')}
        loading={saving}
      />
    )
  }

  // Assist step — show same team players minus the scorer
  const assistPlayers = players.filter((p) => p.id !== selectedPlayerId)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={() => setStep('player')} className="rounded-lg p-2 hover:bg-accent" disabled={saving}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground">Goal — Step 3 of 3</p>
          <h2 className="text-lg font-semibold">Who assisted?</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <button
          onClick={handleNoAssist}
          disabled={saving}
          className="mb-4 w-full rounded-xl border-2 border-dashed border-border bg-card p-4 text-center font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground active:bg-accent disabled:opacity-50"
        >
          No assist
        </button>

        <div className="grid grid-cols-2 gap-3">
          {assistPlayers.map((player) => {
            const inLineup = lineupIds.has(player.id)
            return (
              <button
                key={player.id}
                onClick={() => handleAssistSelect(player.id)}
                disabled={saving}
                className={`flex items-center gap-3 rounded-xl border-2 bg-card p-4 text-left transition-colors hover:border-primary active:bg-accent disabled:opacity-50 ${inLineup ? 'border-border' : 'border-border/40 opacity-60'}`}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold ${inLineup ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {player.number}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{player.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {player.position}{!inLineup ? ' · Sub' : ''}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
