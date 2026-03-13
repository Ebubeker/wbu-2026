'use client'

import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useState } from 'react'
import type { LiveEvent } from '../types'

interface RefereeTimelineProps {
  events: LiveEvent[]
  onDelete: (eventId: string, type: 'goal' | 'card') => void
  readOnly?: boolean
}

export function RefereeTimeline({ events, onDelete, readOnly }: RefereeTimelineProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'goal' | 'card' } | null>(null)

  const sorted = [...events].sort((a, b) => a.minute - b.minute)

  if (sorted.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No events yet
      </p>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {sorted.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
              {event.type === 'goal' ? '⚽' : event.cardType === 'RED' ? '🟥' : '🟨'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {event.playerName}
                {event.isOwnGoal && <span className="ml-1 text-xs text-red-400">(OG)</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {event.teamName} · {event.minute}&apos;
              </p>
            </div>
            {!readOnly && (
              <button
                onClick={() => setDeleteTarget({ id: event.id, type: event.type })}
                className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            onDelete(deleteTarget.id, deleteTarget.type)
            setDeleteTarget(null)
          }
        }}
      />
    </>
  )
}
