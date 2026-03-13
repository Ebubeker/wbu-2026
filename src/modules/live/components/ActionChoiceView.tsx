'use client'

import { ArrowLeft } from 'lucide-react'

interface ActionChoiceViewProps {
  onSelectGoal: () => void
  onSelectCard: () => void
  onBack: () => void
}

export function ActionChoiceView({ onSelectGoal, onSelectCard, onBack }: ActionChoiceViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onBack} className="rounded-lg p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">Select Action</h2>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <button
          onClick={onSelectGoal}
          className="flex flex-1 items-center justify-center rounded-2xl bg-emerald-600 text-white text-2xl font-bold transition-colors hover:bg-emerald-700 active:bg-emerald-800"
        >
          <div className="text-center">
            <div className="text-5xl mb-2">⚽</div>
            <div>Goal</div>
          </div>
        </button>

        <button
          onClick={onSelectCard}
          className="flex flex-1 items-center justify-center rounded-2xl bg-amber-500 text-white text-2xl font-bold transition-colors hover:bg-amber-600 active:bg-amber-700"
        >
          <div className="text-center">
            <div className="text-5xl mb-2">🟨</div>
            <div>Card</div>
          </div>
        </button>
      </div>
    </div>
  )
}
