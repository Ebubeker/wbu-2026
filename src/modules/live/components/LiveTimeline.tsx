'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Pencil, Trash2 } from 'lucide-react'
import type { LiveEvent } from '../types'

interface LiveTimelineProps {
  events: LiveEvent[]
  onEdit?: (event: LiveEvent) => void
  onDelete?: (eventId: string, type: 'goal' | 'card') => void
}

export function LiveTimeline({ events, onEdit, onDelete }: LiveTimelineProps) {
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    type: 'goal' | 'card'
  } | null>(null)

  const sorted = [...events].sort((a, b) => a.minute - b.minute)

  function getIcon(event: LiveEvent): string {
    if (event.type === 'goal') return '\u26BD'
    if (event.cardType === 'YELLOW') return '\uD83D\uDFE8'
    if (event.cardType === 'RED') return '\uD83D\uDFE5'
    return ''
  }

  return (
    <div className="space-y-2">
      {sorted.map((event) => (
        <div
          key={event.id}
          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
        >
          <span className="text-sm font-medium text-muted-foreground w-8 text-right tabular-nums">
            {event.minute}&apos;
          </span>
          <span className="text-lg">{getIcon(event)}</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">
              #{event.playerNumber} {event.playerName}
            </span>
            {event.isOwnGoal && (
              <span className="text-xs text-red-500 ml-1">(OG)</span>
            )}
            <span className="text-xs text-muted-foreground ml-2">
              {event.teamName}
            </span>
          </div>
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onEdit(event)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() =>
                    setDeleteTarget({ id: event.id, type: event.type })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      ))}

      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No events yet
        </p>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget && onDelete) {
            onDelete(deleteTarget.id, deleteTarget.type)
            setDeleteTarget(null)
          }
        }}
      />
    </div>
  )
}
