'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { updateMatchStatus } from '../actions'
import { toast } from 'sonner'
import { Play, Pause, Square, RotateCcw } from 'lucide-react'

interface MatchStatusControlsProps {
  matchId: string
  status: string
  onStatusChange?: (newStatus: string) => void
}

export function MatchStatusControls({
  matchId,
  status,
  onStatusChange,
}: MatchStatusControlsProps) {
  const [loading, setLoading] = useState(false)
  const [confirmFullTime, setConfirmFullTime] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(false)

  async function handleStatusChange(newStatus: string, minute: number) {
    setLoading(true)
    try {
      await updateMatchStatus(matchId, newStatus, minute)
      toast.success(`Match status updated to ${newStatus.replace('_', ' ')}`)
      onStatusChange?.(newStatus)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update status'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {status === 'SCHEDULED' && (
        <Button
          className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-lg"
          onClick={() => handleStatusChange('FIRST_HALF', 1)}
          disabled={loading}
        >
          <Play className="h-5 w-5 mr-2" />
          Start Match
        </Button>
      )}

      {status === 'FIRST_HALF' && (
        <Button
          className="w-full h-14 bg-yellow-500 hover:bg-yellow-600 text-black text-lg"
          onClick={() => handleStatusChange('HALF_TIME', 45)}
          disabled={loading}
        >
          <Pause className="h-5 w-5 mr-2" />
          Half Time
        </Button>
      )}

      {status === 'HALF_TIME' && (
        <Button
          className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-lg"
          onClick={() => handleStatusChange('SECOND_HALF', 46)}
          disabled={loading}
        >
          <Play className="h-5 w-5 mr-2" />
          Start 2nd Half
        </Button>
      )}

      {status === 'SECOND_HALF' && (
        <>
          <Button
            className="w-full h-14 bg-red-600 hover:bg-red-700 text-white text-lg"
            onClick={() => setConfirmFullTime(true)}
            disabled={loading}
          >
            <Square className="h-5 w-5 mr-2" />
            Full Time
          </Button>

          <ConfirmDialog
            open={confirmFullTime}
            onOpenChange={setConfirmFullTime}
            title="End Match"
            description="Are you sure you want to end this match? This will mark the match as full time."
            confirmText="End Match"
            variant="destructive"
            onConfirm={() => {
              setConfirmFullTime(false)
              handleStatusChange('FULL_TIME', 90)
            }}
          />
        </>
      )}

      {status === 'FULL_TIME' && (
        <div className="space-y-2">
          <div className="text-center py-2">
            <span className="text-sm font-medium text-muted-foreground">
              Match Ended
            </span>
          </div>
          <Button
            variant="outline"
            className="w-full h-14 text-lg"
            onClick={() => setConfirmReopen(true)}
            disabled={loading}
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Reopen Match
          </Button>

          <ConfirmDialog
            open={confirmReopen}
            onOpenChange={setConfirmReopen}
            title="Reopen Match"
            description="Are you sure you want to reopen this match? It will be set back to the second half."
            confirmText="Reopen"
            variant="default"
            onConfirm={() => {
              setConfirmReopen(false)
              handleStatusChange('SECOND_HALF', 90)
            }}
          />
        </div>
      )}
    </div>
  )
}
