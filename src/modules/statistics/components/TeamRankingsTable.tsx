import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { FormBadges } from './FormBadges'
import type { TeamRanking } from '../types'

export function TeamRankingsTable({ rankings }: { rankings: TeamRanking[] }) {
  if (rankings.length === 0) return null

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-lg font-semibold">Team Rankings</h3>
        </div>

        {/* Mobile view */}
        <div className="space-y-2 p-4 md:hidden">
          {rankings.map((team, i) => (
            <div key={team.teamId} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/teams/${team.teamId}`} className="font-medium hover:underline">
                  {team.teamName}
                </Link>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{team.played}P</span>
                  <span>{team.won}W</span>
                  <span>{team.drawn}D</span>
                  <span>{team.lost}L</span>
                  <span>GD:{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</span>
                </div>
                <div className="mt-1"><FormBadges form={team.form} /></div>
              </div>
              <span className="text-xl font-bold">{team.points}</span>
            </div>
          ))}
        </div>

        {/* Desktop view */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-3 py-2 text-center w-10">#</th>
                <th className="px-3 py-2 text-left">Team</th>
                <th className="px-3 py-2 text-center">P</th>
                <th className="px-3 py-2 text-center">W</th>
                <th className="px-3 py-2 text-center">D</th>
                <th className="px-3 py-2 text-center">L</th>
                <th className="px-3 py-2 text-center">GF</th>
                <th className="px-3 py-2 text-center">GA</th>
                <th className="px-3 py-2 text-center">GD</th>
                <th className="px-3 py-2 text-center">Pts</th>
                <th className="px-3 py-2 text-center">Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rankings.map((team, i) => (
                <tr key={team.teamId}>
                  <td className="px-3 py-2 text-center font-bold">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link href={`/teams/${team.teamId}`} className="font-medium hover:underline">
                      {team.teamName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center">{team.played}</td>
                  <td className="px-3 py-2 text-center">{team.won}</td>
                  <td className="px-3 py-2 text-center">{team.drawn}</td>
                  <td className="px-3 py-2 text-center">{team.lost}</td>
                  <td className="px-3 py-2 text-center">{team.goalsFor}</td>
                  <td className="px-3 py-2 text-center">{team.goalsAgainst}</td>
                  <td className="px-3 py-2 text-center">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                  <td className="px-3 py-2 text-center font-bold">{team.points}</td>
                  <td className="px-3 py-2 text-center"><FormBadges form={team.form} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
