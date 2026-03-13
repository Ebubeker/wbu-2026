'use client'

import { useState, useEffect, useCallback } from 'react'

interface LiveMinuteProps {
  status: string
  timerStartedAt?: string | Date | null
  timerPausedAt?: string | Date | null
  pausedElapsed?: number
}

export function LiveMinute({ status, timerStartedAt, timerPausedAt, pausedElapsed = 0 }: LiveMinuteProps) {
  const computeMinute = useCallback(() => {
    if (!timerStartedAt) return 0

    const start = new Date(timerStartedAt).getTime()
    const now = timerPausedAt ? new Date(timerPausedAt).getTime() : Date.now()
    const elapsedMs = Math.max(0, now - start - pausedElapsed)
    const rawMinutes = Math.floor(elapsedMs / 60000)
    const clamped = Math.min(30, rawMinutes)

    return status === 'SECOND_HALF' ? clamped + 30 : clamped
  }, [status, timerStartedAt, timerPausedAt, pausedElapsed])

  const [minute, setMinute] = useState(computeMinute)

  useEffect(() => {
    setMinute(computeMinute())

    if (!timerStartedAt || timerPausedAt) return

    const interval = setInterval(() => {
      setMinute(computeMinute())
    }, 10000) // update every 10s for display

    return () => clearInterval(interval)
  }, [timerStartedAt, timerPausedAt, computeMinute])

  return <>{minute}&apos;</>
}
