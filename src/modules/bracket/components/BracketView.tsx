'use client'

import Link from 'next/link'
import { GitBranch } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'
import type { BracketMatch, BracketRound } from '../types'

interface BracketViewProps {
  rounds: BracketRound[]
}

function isLive(status: string): boolean {
  return ['FIRST_HALF', 'SECOND_HALF'].includes(status)
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TeamSlot({
  team,
  placeholder,
  score,
  showScore,
  isWinner,
}: {
  team: BracketMatch['homeTeam']
  placeholder: string | null
  score: number
  showScore: boolean
  isWinner: boolean
}) {
  const hasTeam = !!team
  const label = hasTeam ? team.name : placeholder || 'TBD'
  const shortLabel = hasTeam ? team.shortName : placeholder || 'TBD'

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm',
        hasTeam ? 'border-border bg-background' : 'border-dashed border-border/60 bg-muted/30',
        isWinner && 'border-primary/30 bg-primary/5'
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {hasTeam && team.logo ? (
          <img
            src={team.logo}
            alt={team.name}
            className="h-7 w-7 rounded-lg border border-border bg-background object-cover p-0.5"
          />
        ) : (
          <div className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg border text-[10px] font-semibold",
            hasTeam ? "border-border bg-secondary text-foreground" : "border-dashed border-border/60 text-muted-foreground"
          )}>
            {shortLabel}
          </div>
        )}
        <span className={cn(
          "truncate font-medium",
          hasTeam ? "text-foreground" : "text-muted-foreground italic"
        )}>
          {label}
        </span>
      </div>
      {showScore && (
        <span className="text-base font-bold tabular-nums text-foreground">
          {score}
        </span>
      )}
    </div>
  )
}

function BracketMatchCard({ match }: { match: BracketMatch }) {
  const live = isLive(match.status)
  const finished = match.status === 'FULL_TIME'
  const showScore = finished || live
  const hasTeams = !!match.homeTeam && !!match.awayTeam

  const homeWinner = finished && match.homeScore > match.awayScore
  const awayWinner = finished && match.awayScore > match.homeScore

  const content = (
    <Card
      className={cn(
        'overflow-hidden transition-colors',
        hasTeams && 'hover:bg-secondary/30',
        live && 'border-red-200'
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-xs">
            {match.status === 'SCHEDULED' ? 'Scheduled' : match.status === 'FULL_TIME' ? 'Full time' : match.status.replace('_', ' ')}
          </Badge>
          {live && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse-live" />
              LIVE
            </span>
          )}
        </div>

        <TeamSlot
          team={match.homeTeam}
          placeholder={match.homePlaceholder}
          score={match.homeScore}
          showScore={showScore}
          isWinner={homeWinner}
        />

        <TeamSlot
          team={match.awayTeam}
          placeholder={match.awayPlaceholder}
          score={match.awayScore}
          showScore={showScore}
          isWinner={awayWinner}
        />

        <p className="text-xs text-muted-foreground">
          {formatDate(match.matchDate)}
          {match.venue && <span> · {match.venue}</span>}
        </p>
      </CardContent>
    </Card>
  )

  if (hasTeams) {
    return <Link href={`/matches/${match.id}`} className="block">{content}</Link>
  }

  return content
}

export function BracketView({ rounds }: BracketViewProps) {
  if (rounds.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No knockout matches yet"
        description="The bracket will appear once knockout stage matches are set up."
      />
    )
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex items-start gap-4 overflow-x-auto pb-4">
        {rounds.map((round, roundIndex) => (
          <div key={round.stage} className="flex items-start">
            <div className="flex min-w-[280px] flex-col items-center">
              <Badge variant="secondary" className="mb-4">
                {round.label}
              </Badge>
              <div
                className="flex flex-col justify-center gap-6"
                style={{
                  minHeight:
                    roundIndex === 0
                      ? 'auto'
                      : `${rounds[0].matches.length * 168}px`,
                }}
              >
                {round.matches.map((match) => (
                  <BracketMatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>

            {roundIndex < rounds.length - 1 && (
              <div className="flex items-center self-center px-3">
                <div className="w-10 border-t-2 border-dashed border-border" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile */}
      <div className="space-y-8 md:hidden">
        {rounds.map((round) => (
          <div key={round.stage} className="space-y-3">
            <div className="flex justify-center">
              <Badge variant="secondary">{round.label}</Badge>
            </div>
            <div className="space-y-3">
              {round.matches.map((match) => (
                <BracketMatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
