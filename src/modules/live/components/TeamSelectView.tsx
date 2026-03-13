'use client'

import { ArrowLeft } from 'lucide-react'

interface TeamInfo {
  id: string
  name: string
  shortName: string
  logo: string | null
}

interface TeamSelectViewProps {
  title: string
  stepLabel: string
  homeTeam: TeamInfo
  awayTeam: TeamInfo
  onSelect: (teamId: string) => void
  onBack: () => void
  showOwnGoalToggle?: boolean
  isOwnGoal?: boolean
  onToggleOwnGoal?: () => void
}

export function TeamSelectView({
  title,
  stepLabel,
  homeTeam,
  awayTeam,
  onSelect,
  onBack,
  showOwnGoalToggle,
  isOwnGoal,
  onToggleOwnGoal,
}: TeamSelectViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="rounded-lg p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs text-muted-foreground">{stepLabel}</p>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <button
          onClick={() => onSelect(homeTeam.id)}
          className="flex flex-1 items-center justify-center gap-4 rounded-2xl border-2 border-border bg-card p-6 text-xl font-bold transition-colors hover:border-primary active:bg-accent"
        >
          {homeTeam.logo ? (
            <img src={homeTeam.logo} alt={homeTeam.name} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-sm font-bold">{homeTeam.shortName}</div>
          )}
          <div>
            <div>{homeTeam.name}</div>
            <div className="text-sm font-normal text-muted-foreground">Home</div>
          </div>
        </button>

        <button
          onClick={() => onSelect(awayTeam.id)}
          className="flex flex-1 items-center justify-center gap-4 rounded-2xl border-2 border-border bg-card p-6 text-xl font-bold transition-colors hover:border-primary active:bg-accent"
        >
          {awayTeam.logo ? (
            <img src={awayTeam.logo} alt={awayTeam.name} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-sm font-bold">{awayTeam.shortName}</div>
          )}
          <div>
            <div>{awayTeam.name}</div>
            <div className="text-sm font-normal text-muted-foreground">Away</div>
          </div>
        </button>
      </div>

      {showOwnGoalToggle && (
        <div className="border-t border-border p-4">
          <button
            onClick={onToggleOwnGoal}
            className={`w-full rounded-xl border-2 px-4 py-3 text-center font-medium transition-colors ${
              isOwnGoal
                ? 'border-red-500 bg-red-500/10 text-red-400'
                : 'border-border text-muted-foreground hover:border-red-500/50'
            }`}
          >
            {isOwnGoal ? '✓ Own Goal' : 'Own Goal'}
          </button>
        </div>
      )}
    </div>
  )
}
