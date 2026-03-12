'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { generateFingerprint } from '@/lib/fingerprint'
import type { VoteCounts } from '../types'

interface VotePanelProps {
  matchId: string
  homeTeamName: string
  awayTeamName: string
  isFinished: boolean
}

export function VotePanel({ matchId, homeTeamName, awayTeamName, isFinished }: VotePanelProps) {
  const [counts, setCounts] = useState<VoteCounts | null>(null)
  const [fingerprint, setFingerprint] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)

  const fetchCounts = useCallback(async (fp: string) => {
    const res = await fetch(`/api/matches/${matchId}/vote?fingerprint=${fp}`)
    if (res.ok) {
      setCounts(await res.json())
    }
  }, [matchId])

  useEffect(() => {
    generateFingerprint().then((fp) => {
      setFingerprint(fp)
      fetchCounts(fp)
    })
  }, [fetchCounts])

  async function handleVote(vote: 'HOME' | 'DRAW' | 'AWAY') {
    if (!fingerprint || voting) return
    setVoting(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote, fingerprint }),
      })

      if (res.status === 409) {
        toast.info("You've already voted on this match")
        await fetchCounts(fingerprint)
        return
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setCounts(await res.json())
      toast.success('Vote recorded!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to vote')
    } finally {
      setVoting(false)
    }
  }

  const hasVoted = counts?.userVote != null
  const total = counts?.total ?? 0

  function pct(n: number) {
    if (total === 0) return 0
    return Math.round((n / total) * 100)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fan Prediction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasVoted && !isFinished ? (
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={() => handleVote('HOME')}
              disabled={voting}
              className="flex flex-col py-4 h-auto"
            >
              <span className="text-xs text-muted-foreground">Home</span>
              <span className="font-semibold text-sm">{homeTeamName}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleVote('DRAW')}
              disabled={voting}
              className="flex flex-col py-4 h-auto"
            >
              <span className="text-xs text-muted-foreground">Draw</span>
              <span className="font-semibold text-sm">X</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleVote('AWAY')}
              disabled={voting}
              className="flex flex-col py-4 h-auto"
            >
              <span className="text-xs text-muted-foreground">Away</span>
              <span className="font-semibold text-sm">{awayTeamName}</span>
            </Button>
          </div>
        ) : counts ? (
          <div className="space-y-3">
            {[
              { label: homeTeamName, count: counts.home, vote: 'HOME' as const },
              { label: 'Draw', count: counts.draw, vote: 'DRAW' as const },
              { label: awayTeamName, count: counts.away, vote: 'AWAY' as const },
            ].map((item) => (
              <div key={item.vote}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={counts.userVote === item.vote ? 'font-semibold text-primary' : ''}>
                    {item.label}
                  </span>
                  <span className="text-muted-foreground">{pct(item.count)}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      counts.userVote === item.vote ? 'bg-primary' : 'bg-muted-foreground/40'
                    }`}
                    style={{ width: `${pct(item.count)}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center">
              {total} vote{total !== 1 ? 's' : ''}
              {hasVoted && ' \u2014 your vote is in!'}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
