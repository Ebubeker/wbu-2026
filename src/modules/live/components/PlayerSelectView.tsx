'use client'

import { ArrowLeft } from 'lucide-react'

interface PlayerInfo {
  id: string
  name: string
  number: number
  position?: string
}

interface PlayerSelectViewProps {
  title: string
  stepLabel: string
  players: PlayerInfo[]
  lineupIds?: Set<string>
  onSelect: (playerId: string) => void
  onBack: () => void
  loading?: boolean
}

export function PlayerSelectView({
  title,
  stepLabel,
  players,
  lineupIds,
  onSelect,
  onBack,
  loading,
}: PlayerSelectViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="rounded-lg p-2 hover:bg-accent" disabled={loading}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground">{stepLabel}</p>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {players.map((player) => {
            const inLineup = lineupIds ? lineupIds.has(player.id) : true
            return (
              <button
                key={player.id}
                onClick={() => onSelect(player.id)}
                disabled={loading}
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

        {players.length === 0 && (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            No players available
          </div>
        )}
      </div>
    </div>
  )
}
