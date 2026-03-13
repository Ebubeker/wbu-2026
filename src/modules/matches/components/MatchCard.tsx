'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock3, MapPin, Radio } from 'lucide-react'
import { LiveMinute } from './LiveMinute'
import type { MatchData } from '../types'

interface MatchCardProps {
  match: MatchData
  linkPrefix?: string
}

function TeamMark({
  team,
  placeholder,
  align = 'left',
}: {
  team: MatchData['homeTeam']
  placeholder?: string | null
  align?: 'left' | 'right'
}) {
  const isRight = align === 'right'
  const label = team?.shortName ?? placeholder ?? '—'

  if (!team) {
    return (
      <div className={`flex items-center gap-3 ${isRight ? 'flex-row-reverse text-right' : ''}`}>
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary/50 p-1">
          <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-muted-foreground">{label}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${isRight ? 'flex-row-reverse text-right' : ''}`}>
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary p-1">
        {team.logo ? (
          <Image
            src={team.logo}
            alt={team.name}
            fill
            className="object-contain p-1"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-foreground">
            {team.shortName}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{team.name}</p>
        <p className="text-xs text-muted-foreground">
          {team.shortName}
        </p>
      </div>
    </div>
  )
}

export function MatchCard({ match, linkPrefix = '/matches' }: MatchCardProps) {
  const isScheduled = match.status === 'SCHEDULED'
  const isLive = ['FIRST_HALF', 'HALF_TIME', 'SECOND_HALF'].includes(match.status)
  const isFinished = match.status === 'FULL_TIME'

  return (
    <Link href={`${linkPrefix}/${match.id}`} className="block">
      <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wider">{match.stage.replaceAll('_', ' ')}</span>
            {match.group && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span>{match.group.name}</span>
              </>
            )}
          </div>

          {isLive ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
              <Radio className="h-3 w-3" />
              <LiveMinute
                status={match.status}
                timerStartedAt={match.timerStartedAt}
                timerPausedAt={match.timerPausedAt}
                pausedElapsed={match.pausedElapsed}
              />
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {isFinished ? 'Full time' : formatTime(match.matchDate)}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-secondary/50 px-4 py-3">
          <div className="min-w-0 flex-1">
            <TeamMark team={match.homeTeam} placeholder={match.homePlaceholder} />
          </div>

          <div className="min-w-[80px] text-center">
            {isScheduled ? (
              <p className="text-lg font-semibold text-foreground">
                {formatTime(match.matchDate)}
              </p>
            ) : (
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {match.homeScore} - {match.awayScore}
              </p>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex justify-end">
              <TeamMark team={match.awayTeam} placeholder={match.awayPlaceholder} align="right" />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3 w-3" />
            <span>
              {formatDate(match.matchDate)} · {formatTime(match.matchDate)}
            </span>
          </div>
          {match.venue && (
            <div className="inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              <span>{match.venue}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
