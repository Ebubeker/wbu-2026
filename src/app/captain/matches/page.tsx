import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { ClipboardList } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CaptainMatchesPage() {
  const session = await getSession()
  if (!session || !session.teamId) redirect('/login')

  const teamId = session.teamId

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true } },
      awayTeam: { select: { id: true, name: true, shortName: true } },
      lineups: { where: { teamId }, select: { id: true } },
    },
    orderBy: { matchDate: 'asc' },
  })

  const upcoming = matches.filter((m) => m.status === 'SCHEDULED')
  const live = matches.filter((m) => ['FIRST_HALF', 'HALF_TIME', 'SECOND_HALF'].includes(m.status))
  const completed = matches.filter((m) => m.status === 'FULL_TIME')

  function MatchRow({ match }: { match: typeof matches[0] }) {
    const isHome = match.homeTeamId === teamId
    const opponent = isHome ? match.awayTeam : match.homeTeam
    const hasLineup = match.lineups.length > 0
    const isScheduled = match.status === 'SCHEDULED'

    return (
      <Card key={match.id}>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Badge variant={isHome ? 'default' : 'outline'}>
              {isHome ? 'HOME' : 'AWAY'}
            </Badge>
            <div>
              <p className="font-medium">
                vs {opponent?.name ?? match.homePlaceholder ?? match.awayPlaceholder ?? 'TBD'}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(match.matchDate), "MMM d, yyyy 'at' HH:mm")}
                {' \u00B7 '}
                {match.stage.replaceAll('_', ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {match.status === 'FULL_TIME' && (
              <span className="font-mono font-bold text-sm">
                {match.homeScore} - {match.awayScore}
              </span>
            )}
            {hasLineup && (
              <Badge variant="outline" className="text-xs">Lineup set</Badge>
            )}
            {isScheduled && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/captain/matches/${match.id}/lineup`}>
                  <ClipboardList className="h-4 w-4 mr-1" />
                  Lineup
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <PageHeader
        title="Match Center"
        description="View your matches and manage lineups"
      />

      {live.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Badge className="bg-red-500">Live</Badge>
          </h2>
          <div className="space-y-3">
            {live.map((match) => <MatchRow key={match.id} match={match} />)}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.map((match) => <MatchRow key={match.id} match={match} />)}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Completed</h2>
          <div className="space-y-3">
            {completed.map((match) => <MatchRow key={match.id} match={match} />)}
          </div>
        </div>
      )}

      {matches.length === 0 && (
        <p className="text-muted-foreground mt-6">No matches scheduled for your team yet.</p>
      )}
    </div>
  )
}
