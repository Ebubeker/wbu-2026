'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { generateFingerprint } from '@/lib/fingerprint'
import { cn } from '@/lib/utils'
import type { MotmResult } from '../types'

interface MotmPlayer {
  id: string
  name: string
  number: number
  teamName: string
  teamId: string
}

interface MotmPanelProps {
  matchId: string
  players: MotmPlayer[]
}

export function MotmPanel({ matchId, players }: MotmPanelProps) {
  const [results, setResults] = useState<MotmResult | null>(null)
  const [fingerprint, setFingerprint] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)

  const fetchResults = useCallback(async (fp: string) => {
    const res = await fetch(`/api/matches/${matchId}/motm?fingerprint=${fp}`)
    if (res.ok) {
      setResults(await res.json())
    }
  }, [matchId])

  useEffect(() => {
    generateFingerprint().then((fp) => {
      setFingerprint(fp)
      fetchResults(fp)
    })
  }, [fetchResults])

  async function handleVote(playerId: string) {
    if (!fingerprint || voting) return
    setVoting(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/motm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, fingerprint }),
      })

      if (res.status === 409) {
        toast.info("You've already voted for Man of the Match")
        await fetchResults(fingerprint)
        return
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setResults(await res.json())
      toast.success('MOTM vote recorded!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to vote')
    } finally {
      setVoting(false)
    }
  }

  const hasVoted = results?.userVote != null
  const total = results?.total ?? 0
  const topPlayerId = results?.candidates?.[0]?.playerId

  function pct(n: number) {
    if (total === 0) return 0
    return Math.round((n / total) * 100)
  }

  // Group players by team for the voting UI
  const teamGroups = players.reduce<Record<string, MotmPlayer[]>>((acc, p) => {
    if (!acc[p.teamName]) acc[p.teamName] = []
    acc[p.teamName].push(p)
    return acc
  }, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span>⭐</span> Man of the Match
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasVoted ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vote for the best player of the match
            </p>
            {Object.entries(teamGroups).map(([teamName, teamPlayers]) => (
              <div key={teamName}>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  {teamName}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {teamPlayers.map((player) => (
                    <Button
                      key={player.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleVote(player.id)}
                      disabled={voting}
                      className="justify-start h-auto py-2 px-3"
                    >
                      <span className="text-xs text-muted-foreground mr-1.5">#{player.number}</span>
                      <span className="text-sm truncate">{player.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : results ? (
          <div className="space-y-2">
            {results.candidates.slice(0, 5).map((candidate, index) => {
              const isWinner = index === 0 && total > 0
              const isUserPick = results.userVote === candidate.playerId
              return (
                <div key={candidate.playerId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={cn(
                      'flex items-center gap-1.5',
                      isWinner && 'font-bold text-amber-600',
                      isUserPick && !isWinner && 'font-semibold text-primary',
                    )}>
                      {isWinner && <span>🏆</span>}
                      {candidate.playerName}
                      <span className="text-xs text-muted-foreground">#{candidate.playerNumber}</span>
                    </span>
                    <span className={cn(
                      'text-muted-foreground',
                      isWinner && 'font-bold text-amber-600',
                    )}>
                      {pct(candidate.votes)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        isWinner
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                          : isUserPick
                            ? 'bg-primary'
                            : 'bg-muted-foreground/40',
                      )}
                      style={{ width: `${pct(candidate.votes)}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <p className="text-xs text-muted-foreground text-center pt-1">
              {total} vote{total !== 1 ? 's' : ''}
              {hasVoted && ' — your vote is in!'}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
