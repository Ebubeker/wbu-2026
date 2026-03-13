import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { StandingsRow } from '../types'

interface StandingsTableProps {
  groupId?: string
  groupName: string
  standings: StandingsRow[]
  qualifyCount?: number
}

function TeamIdentity({ row }: { row: StandingsRow }) {
  return (
    <Link
      href={`/teams/${row.team.id}`}
      className="flex min-w-0 items-center gap-3 hover:underline"
    >
      {row.team.logo ? (
        <img
          src={row.team.logo}
          alt={row.team.name}
          className="h-10 w-10 rounded-[12px] border border-white/10 bg-background object-cover p-2"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/10 bg-background text-xs font-semibold text-foreground">
          {row.team.shortName}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{row.team.name}</p>
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          {row.team.shortName}
        </p>
      </div>
    </Link>
  )
}

function StatPill({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-background px-3 py-2 text-center">
      <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  )
}

export function StandingsTable({
  groupId,
  groupName,
  standings,
  qualifyCount = 2,
}: StandingsTableProps) {
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
          <Badge variant="secondary">Top {qualifyCount} advance</Badge>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {standings.map((row) => {
            const isQualifying = row.position <= qualifyCount

            return (
              <div
                key={row.team.id}
                className={cn(
                  'rounded-[18px] border border-white/10 bg-background p-4',
                  isQualifying && 'border-emerald-400/20 bg-emerald-500/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border text-sm font-semibold',
                      isQualifying
                        ? 'border-emerald-300/30 bg-emerald-400/15 text-emerald-50'
                        : 'border-white/10 bg-background text-foreground'
                    )}
                  >
                    {row.position}
                  </div>

                  <div className="min-w-0 flex-1">
                    <TeamIdentity row={row} />
                  </div>

                  <div className="text-right">
                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                      Pts
                    </p>
                    <p className="text-3xl font-bold text-foreground">{row.points}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  <StatPill label="P" value={row.played} />
                  <StatPill label="W" value={row.won} />
                  <StatPill label="D" value={row.drawn} />
                  <StatPill label="L" value={row.lost} />
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  <StatPill label="GF" value={row.goalsFor} />
                  <StatPill label="GA" value={row.goalsAgainst} />
                  <StatPill
                    label="GD"
                    value={row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="hidden p-4 md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="w-10 text-center">P</TableHead>
                <TableHead className="w-10 text-center">W</TableHead>
                <TableHead className="w-10 text-center">D</TableHead>
                <TableHead className="w-10 text-center">L</TableHead>
                <TableHead className="w-10 text-center">GF</TableHead>
                <TableHead className="w-10 text-center">GA</TableHead>
                <TableHead className="w-12 text-center">GD</TableHead>
                <TableHead className="w-12 text-center">Pts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((row) => {
                const isQualifying = row.position <= qualifyCount

                return (
                  <TableRow
                    key={row.team.id}
                    className={cn(isQualifying && 'bg-emerald-500/10')}
                  >
                    <TableCell className="text-center font-semibold">
                      <span
                        className={cn(
                          'inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 bg-background',
                          isQualifying && 'border-emerald-300/30 bg-emerald-400/15 text-emerald-50'
                        )}
                      >
                        {row.position}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TeamIdentity row={row} />
                    </TableCell>
                    <TableCell className="text-center">{row.played}</TableCell>
                    <TableCell className="text-center">{row.won}</TableCell>
                    <TableCell className="text-center">{row.drawn}</TableCell>
                    <TableCell className="text-center">{row.lost}</TableCell>
                    <TableCell className="text-center">{row.goalsFor}</TableCell>
                    <TableCell className="text-center">{row.goalsAgainst}</TableCell>
                    <TableCell className="text-center">
                      {row.goalDifference > 0
                        ? `+${row.goalDifference}`
                        : row.goalDifference}
                    </TableCell>
                    <TableCell className="text-center font-bold">{row.points}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
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
