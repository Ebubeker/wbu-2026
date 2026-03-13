'use client'

import { useState, useEffect, useCallback } from 'react'

interface MatchTimerProps {
  status: string
  timerStartedAt: string | null
  timerPausedAt: string | null
  pausedElapsed: number
  className?: string
}

export function MatchTimer({
  status,
  timerStartedAt,
  timerPausedAt,
  pausedElapsed,
  className,
}: MatchTimerProps) {
  const computeElapsed = useCallback(() => {
    if (!timerStartedAt) return 0

    const start = new Date(timerStartedAt).getTime()
    const now = timerPausedAt
      ? new Date(timerPausedAt).getTime()
      : Date.now()

    return Math.max(0, now - start - pausedElapsed)
  }, [timerStartedAt, timerPausedAt, pausedElapsed])

  const [elapsed, setElapsed] = useState(computeElapsed)

  useEffect(() => {
    setElapsed(computeElapsed())

    if (!timerStartedAt || timerPausedAt) return

    const interval = setInterval(() => {
      setElapsed(computeElapsed())
    }, 1000)

    return () => clearInterval(interval)
  }, [timerStartedAt, timerPausedAt, computeElapsed])

  const totalSeconds = Math.floor(elapsed / 1000)
  const rawMinutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  // Clamp to 30 min per half, add 30 for second half
  const clampedMinutes = Math.min(30, rawMinutes)
  const displayMinutes = status === 'SECOND_HALF' ? clampedMinutes + 30 : clampedMinutes

  const isOvertime = rawMinutes >= 30
  const isPaused = !!timerPausedAt
  const isLive = ['FIRST_HALF', 'SECOND_HALF'].includes(status)

  return (
    <div className={className}>
      <div className={`text-center font-mono text-5xl font-bold tabular-nums ${isOvertime && isLive ? 'text-red-400' : ''} ${isPaused ? 'animate-pulse' : ''}`}>
        {String(displayMinutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
    </div>
  )
}
