import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/PageHeader'
import { ArrowLeft } from 'lucide-react'
import { LineupEditor } from '@/modules/lineups/components/LineupEditor'
import { getLineup } from '@/modules/lineups/queries'
import { getKit } from '@/modules/kits/queries'

export const dynamic = 'force-dynamic'

export default async function CaptainLineupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: matchId } = await params
  const session = await getSession()
  if (!session || !session.teamId) redirect('/login')

  const teamId = session.teamId

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true } },
      awayTeam: { select: { id: true, name: true, shortName: true } },
    },
  })

  if (!match) redirect('/captain/matches')

  // Verify team is in this match
  if (match.homeTeamId !== teamId && match.awayTeamId !== teamId) {
    redirect('/captain/matches')
  }

  const isHome = match.homeTeamId === teamId
  const opponent = isHome ? match.awayTeam : match.homeTeam
  const isLocked = match.status !== 'SCHEDULED'

  // Get squad
  const players = await prisma.player.findMany({
    where: { teamId },
    orderBy: { number: 'asc' },
    select: { id: true, name: true, number: true, position: true },
  })

  // Get existing lineup
  const existingLineup = await getLineup(matchId, teamId)

  // Get kit for preview
  const kitType = isHome ? 'HOME' : 'AWAY'
  const kit = await getKit(teamId, kitType)

  return (
    <div>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/captain/matches">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Matches
          </Link>
        </Button>
      </div>

      <PageHeader
        title={`Lineup: vs ${opponent?.name ?? 'TBD'}`}
        description={isLocked ? 'Match has started \u2014 lineup is locked' : 'Select your formation and assign players'}
      />

      <div className="mt-6">
        <LineupEditor
          matchId={matchId}
          teamId={teamId}
          squad={players}
          existingLineup={existingLineup}
          isLocked={isLocked}
          kitColors={kit ? { primaryColor: kit.primaryColor, secondaryColor: kit.secondaryColor } : null}
        />
      </div>
    </div>
  )
}
