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

        <div className="md:hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 pl-4 pr-1 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-8">#</th>
                  <th className="py-3 px-1 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Team</th>
                  <th className="py-3 px-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-8">P</th>
                  <th className="py-3 px-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-8">W</th>
                  <th className="py-3 px-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-8">D</th>
                  <th className="py-3 px-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-8">L</th>
                  <th className="py-3 px-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-10">DIFF</th>
                  <th className="py-3 px-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-14">GLS</th>
                  <th className="py-3 pl-1 pr-4 text-center text-[11px] font-bold uppercase tracking-wider text-foreground w-10">PTS</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => {
                  const isQualifying = row.position <= qualifyCount
                  return (
                    <tr key={row.team.id} className="border-b border-white/5">
                      <td className="py-2.5 pl-4 pr-1">
                        <span className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                          isQualifying
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white/5 text-muted-foreground'
                        )}>
                          {row.position}
                        </span>
                      </td>
                      <td className="py-2.5 px-1">
                        <Link href={`/teams/${row.team.id}`} className="flex items-center gap-2.5 hover:underline">
                          {row.team.logo ? (
                            <img src={row.team.logo} alt={row.team.name} className="h-6 w-6 shrink-0 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-foreground">
                              {row.team.shortName.slice(0, 2)}
                            </div>
                          )}
                          <span className="truncate text-[13px] font-medium text-foreground">{row.team.name}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 px-1 text-center text-[13px] tabular-nums text-muted-foreground">{row.played}</td>
                      <td className="py-2.5 px-1 text-center text-[13px] tabular-nums text-muted-foreground">{row.won}</td>
                      <td className="py-2.5 px-1 text-center text-[13px] tabular-nums text-muted-foreground">{row.drawn}</td>
                      <td className="py-2.5 px-1 text-center text-[13px] tabular-nums text-muted-foreground">{row.lost}</td>
                      <td className={cn(
                        'py-2.5 px-1 text-center text-[13px] tabular-nums font-medium',
                        row.goalDifference > 0 ? 'text-emerald-400' : row.goalDifference < 0 ? 'text-rose-400' : 'text-muted-foreground'
                      )}>
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </td>
                      <td className="py-2.5 px-1 text-center text-[13px] tabular-nums text-muted-foreground">
                        {row.goalsFor}:{row.goalsAgainst}
                      </td>
                      <td className="py-2.5 pl-1 pr-4 text-center text-[14px] tabular-nums font-bold text-foreground">{row.points}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
