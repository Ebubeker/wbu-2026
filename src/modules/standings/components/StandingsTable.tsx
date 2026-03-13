'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { StandingsRow } from '../types'

interface StandingsTableProps {
  groupId?: string
  groupName: string
  standings: StandingsRow[]
  qualifyCount?: number
}

export function StandingsTable({
  groupId,
  groupName,
  standings,
  qualifyCount = 2,
}: StandingsTableProps) {
  const [expanded, setExpanded] = useState(false)

  const allZeros = standings.every(
    (row) =>
      row.played === 0 &&
      row.won === 0 &&
      row.drawn === 0 &&
      row.lost === 0 &&
      row.goalsFor === 0 &&
      row.goalsAgainst === 0 &&
      row.points === 0
  )

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-primary/75">
              Group Table
            </p>
            {groupId ? (
              <Link href={`/groups/${groupId}`}>
                <h3 className="mt-2 text-2xl font-semibold text-foreground hover:underline">{groupName}</h3>
              </Link>
            ) : (
              <h3 className="mt-2 text-2xl font-semibold text-foreground">{groupName}</h3>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Top {qualifyCount} advance</span>
            {/* Short / Full toggle */}
            <div className="flex">
              <button
                onClick={() => setExpanded(false)}
                className={cn(
                  'rounded-l-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                  !expanded
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/5 text-muted-foreground hover:text-foreground'
                )}
              >
                Short
              </button>
              <button
                onClick={() => setExpanded(true)}
                className={cn(
                  'rounded-r-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                  expanded
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/5 text-muted-foreground hover:text-foreground'
                )}
              >
                Full
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 pl-4 pr-1 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-10">#</th>
                <th className="py-3 px-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Team</th>
                <th className="py-3 px-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-10">P</th>
                {expanded && (
                  <>
                    <th className="py-3 px-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-10">W</th>
                    <th className="py-3 px-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-10">D</th>
                    <th className="py-3 px-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-10">L</th>
                    <th className="py-3 px-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-10">GF</th>
                    <th className="py-3 px-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-10">GA</th>
                  </>
                )}
                <th className="py-3 px-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-12">GD</th>
                <th className="py-3 pl-2 pr-4 text-center text-[11px] font-bold uppercase tracking-wider text-foreground w-12">PTS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => {
                const isQualifying = row.position <= qualifyCount
                return (
                  <tr key={row.team.id} className={cn('border-b border-white/5', isQualifying && 'bg-emerald-500/5')}>
                    <td className="py-3 pl-4 pr-1">
                      <span className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                        isQualifying
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/5 text-muted-foreground'
                      )}>
                        {row.position}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <Link href={`/teams/${row.team.id}`} className="flex items-center gap-2.5 hover:underline">
                        {row.team.logo ? (
                          <img src={row.team.logo} alt={row.team.name} className="h-7 w-7 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                            {row.team.shortName.slice(0, 2)}
                          </div>
                        )}
                        <span className="truncate text-sm font-medium text-foreground">{row.team.name}</span>
                      </Link>
                    </td>
                    <td className="py-3 px-2 text-center text-sm tabular-nums text-muted-foreground">{row.played}</td>
                    {expanded && (
                      <>
                        <td className="py-3 px-2 text-center text-sm tabular-nums text-muted-foreground">{row.won}</td>
                        <td className="py-3 px-2 text-center text-sm tabular-nums text-muted-foreground">{row.drawn}</td>
                        <td className="py-3 px-2 text-center text-sm tabular-nums text-muted-foreground">{row.lost}</td>
                        <td className="py-3 px-2 text-center text-sm tabular-nums text-muted-foreground">{row.goalsFor}</td>
                        <td className="py-3 px-2 text-center text-sm tabular-nums text-muted-foreground">{row.goalsAgainst}</td>
                      </>
                    )}
                    <td className={cn(
                      'py-3 px-2 text-center text-sm tabular-nums font-medium',
                      row.goalDifference > 0 ? 'text-emerald-400' : row.goalDifference < 0 ? 'text-rose-400' : 'text-muted-foreground'
                    )}>
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                    <td className="py-3 pl-2 pr-4 text-center text-sm tabular-nums font-bold text-foreground">{row.points}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {allZeros && (
          <p className="px-4 pb-4 text-center text-sm text-muted-foreground">
            No matches played yet
          </p>
        )}
      </CardContent>
    </Card>
  )
}
