import { redirect } from "next/navigation"
import Link from "next/link"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader } from "@/components/common/PageHeader"
import { format } from "date-fns"
import { Users, Camera, Calendar, Trophy, TrendingUp } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function CaptainDashboard() {
  const session = await getSession()

  if (!session || !session.teamId) {
    redirect("/login")
  }

  const team = await prisma.team.findUnique({
    where: { id: session.teamId },
    include: {
      players: { orderBy: { number: "asc" } },
      group: true,
    },
  })

  if (!team) {
    redirect("/login")
  }

  // Fetch upcoming matches
  const upcomingMatches = await prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      status: "SCHEDULED",
    },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
    orderBy: { matchDate: "asc" },
    take: 3,
  })

  // Calculate team record from completed matches
  const completedMatches = await prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      status: "FULL_TIME",
    },
  })

  let wins = 0
  let draws = 0
  let losses = 0

  for (const match of completedMatches) {
    const isHome = match.homeTeamId === team.id
    const teamScore = isHome ? match.homeScore : match.awayScore
    const opponentScore = isHome ? match.awayScore : match.homeScore

    if (teamScore > opponentScore) wins++
    else if (teamScore === opponentScore) draws++
    else losses++
  }

  // Find group position
  let groupPosition: number | null = null

  if (team.groupId) {
    const groupTeams = await prisma.team.findMany({
      where: { groupId: team.groupId },
      include: {
        homeMatches: { where: { status: "FULL_TIME" } },
        awayMatches: { where: { status: "FULL_TIME" } },
      },
    })

    const standings = groupTeams.map((t) => {
      let pts = 0
      let gd = 0

      for (const m of t.homeMatches) {
        if (m.homeScore > m.awayScore) pts += 3
        else if (m.homeScore === m.awayScore) pts += 1
        gd += m.homeScore - m.awayScore
      }
      for (const m of t.awayMatches) {
        if (m.awayScore > m.homeScore) pts += 3
        else if (m.homeScore === m.awayScore) pts += 1
        gd += m.awayScore - m.homeScore
      }

      return { teamId: t.id, pts, gd }
    })

    standings.sort((a, b) => b.pts - a.pts || b.gd - a.gd)
    const idx = standings.findIndex((s) => s.teamId === team.id)
    if (idx !== -1) groupPosition = idx + 1
  }

  const nextMatch = upcomingMatches[0] ?? null
  const nextOpponent = nextMatch
    ? nextMatch.homeTeamId === team.id
      ? nextMatch.awayTeam
      : nextMatch.homeTeam
    : null

  return (
    <div>
      <PageHeader
        title={`Welcome, ${team.name}`}
        description="Manage your team from the captain dashboard"
      >
        {team.logo && (
          <Avatar className="h-10 w-10">
            <AvatarImage src={team.logo} alt={team.name} />
            <AvatarFallback>{team.shortName}</AvatarFallback>
          </Avatar>
        )}
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Next Match
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextMatch && nextOpponent ? (
              <>
                <p className="font-semibold">vs {nextOpponent.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(nextMatch.matchDate), "MMM d, yyyy 'at' HH:mm")}
                </p>
                {nextMatch.venue && (
                  <p className="text-xs text-muted-foreground mt-1">{nextMatch.venue}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming matches</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Group Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            {team.group && groupPosition ? (
              <>
                <p className="text-2xl font-bold">
                  {groupPosition}
                  <span className="text-sm font-normal text-muted-foreground align-top">
                    {groupPosition === 1 ? "st" : groupPosition === 2 ? "nd" : groupPosition === 3 ? "rd" : "th"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">{team.group.name}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not assigned to a group</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Team Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {wins}W - {draws}D - {losses}L
            </p>
            <p className="text-sm text-muted-foreground">
              {completedMatches.length} match{completedMatches.length !== 1 ? "es" : ""} played
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Edit Team Info</h3>
              <p className="text-sm text-muted-foreground">Update name, logo, and description</p>
            </div>
            <Button asChild>
              <Link href="/captain/team">Edit</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="rounded-full bg-primary/10 p-3">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Manage Player Photos</h3>
              <p className="text-sm text-muted-foreground">Upload or change player photos</p>
            </div>
            <Button asChild>
              <Link href="/captain/players">Manage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming matches */}
      {upcomingMatches.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Upcoming Matches</h2>
          <div className="space-y-3">
            {upcomingMatches.map((match) => {
              const isHome = match.homeTeamId === team.id
              const opponent = isHome ? match.awayTeam : match.homeTeam
              return (
                <Card key={match.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={isHome ? "default" : "outline"}>
                        {isHome ? "HOME" : "AWAY"}
                      </Badge>
                      <div>
                        <p className="font-medium">vs {opponent?.name ?? 'TBD'}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(match.matchDate), "EEEE, MMM d 'at' HH:mm")}
                        </p>
                      </div>
                    </div>
                    {match.venue && (
                      <span className="text-sm text-muted-foreground hidden sm:block">
                        {match.venue}
                      </span>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
