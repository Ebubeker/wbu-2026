import Link from "next/link"
import prisma from "@/lib/db"
import { PageHeader } from "@/components/common/PageHeader"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClientDateTime } from "@/components/common/ClientDateTime"
import {
  Users,
  UserCheck,
  Calendar,
  Trophy,
  PlayCircle,
  Plus,
  FolderOpen,
  TableProperties,
  CircleDot,
  CreditCard,
  Clock,
  ChevronRight,
} from "lucide-react"

export const dynamic = 'force-dynamic'

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default async function AdminDashboard() {
  const [
    teamCount,
    playerCount,
    matchCount,
    playedCount,
    remainingCount,
    liveMatches,
    upcomingMatches,
    recentGoals,
    recentCards,
  ] = await Promise.all([
    prisma.team.count(),
    prisma.player.count(),
    prisma.match.count(),
    prisma.match.count({ where: { status: "FULL_TIME" } }),
    prisma.match.count({ where: { status: "SCHEDULED" } }),
    prisma.match.findMany({
      where: {
        status: { in: ["FIRST_HALF", "HALF_TIME", "SECOND_HALF"] },
      },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
      },
    }),
    prisma.match.findMany({
      where: {
        status: "SCHEDULED",
        homeTeamId: { not: null },
        awayTeamId: { not: null },
      },
      orderBy: { matchDate: "asc" },
      take: 6,
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true } },
        awayTeam: { select: { id: true, name: true, shortName: true } },
        group: { select: { name: true } },
      },
    }),
    prisma.goal.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        player: { select: { name: true } },
        team: { select: { name: true } },
      },
    }),
    prisma.card.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        player: { select: { name: true } },
        team: { select: { name: true } },
      },
    }),
  ])

  // Merge and sort recent activity
  const recentActivity = [
    ...recentGoals.map((g) => ({
      id: g.id,
      type: "goal" as const,
      playerName: g.player.name,
      teamName: g.team.name,
      minute: g.minute,
      createdAt: g.createdAt,
      extra: g.isOwnGoal ? "(OG)" : undefined,
    })),
    ...recentCards.map((c) => ({
      id: c.id,
      type: "card" as const,
      playerName: c.player.name,
      teamName: c.team.name,
      minute: c.minute,
      createdAt: c.createdAt,
      extra: c.type,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)

  const stats = [
    { label: "Total Teams", value: teamCount, icon: Users },
    { label: "Total Players", value: playerCount, icon: UserCheck },
    { label: "Total Matches", value: matchCount, icon: Calendar },
    { label: "Played", value: playedCount, icon: Trophy },
    { label: "Remaining", value: remainingCount, icon: PlayCircle },
  ]

  const quickActions = [
    { label: "Create Team", href: "/admin/teams", icon: Plus },
    { label: "Create Match", href: "/admin/matches", icon: Calendar },
    { label: "Manage Groups", href: "/admin/groups", icon: FolderOpen },
    { label: "View Standings", href: "/standings", icon: TableProperties },
  ]

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Overview of the WBU 2026 Championship" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="flex flex-col items-center justify-center p-4">
                <Icon className="h-6 w-6 text-muted-foreground mb-2" />
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Live Now */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          Live Now
        </h2>
        {liveMatches.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {liveMatches.map((match) => (
              <Card key={match.id} className="border-red-200 bg-red-50/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline" className="border-red-300 bg-red-100 text-red-700">
                      {match.status.replace("_", " ")}
                    </Badge>
                    <span className="text-sm font-mono text-muted-foreground">
                      {match.matchMinute}&apos;
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-center">
                    <div className="flex-1">
                      <p className="font-semibold">{match.homeTeam?.shortName ?? 'TBD'}</p>
                      <p className="text-xs text-muted-foreground">{match.homeTeam?.name ?? ''}</p>
                    </div>
                    <div className="px-4">
                      <p className="text-3xl font-bold">
                        {match.homeScore} - {match.awayScore}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{match.awayTeam?.shortName ?? 'TBD'}</p>
                      <p className="text-xs text-muted-foreground">{match.awayTeam?.name ?? ''}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <Button asChild size="sm">
                      <Link href={`/admin/matches/${match.id}/live`}>
                        Go to Live Control
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No live matches right now
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Upcoming Matches
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcomingMatches.map((match) => (
              <Link key={match.id} href={`/admin/matches/${match.id}/live`}>
                <Card className="transition-colors hover:bg-accent cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold">{match.homeTeam?.shortName ?? 'TBD'}</span>
                          <span className="text-muted-foreground">vs</span>
                          <span className="font-semibold">{match.awayTeam?.shortName ?? 'TBD'}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {match.group && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{match.group.name}</Badge>}
                          <ClientDateTime date={match.matchDate} />
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.label} href={action.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <Icon className="h-8 w-8 text-primary mb-2" />
                    <p className="text-sm font-medium text-center">{action.label}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {recentActivity.map((event) => (
                  <li key={event.id} className="flex items-center gap-3 px-4 py-3">
                    {event.type === "goal" ? (
                      <CircleDot className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <CreditCard
                        className={`h-4 w-4 flex-shrink-0 ${
                          event.extra === "RED" ? "text-red-600" : "text-yellow-500"
                        }`}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{event.playerName}</span>
                        <span className="text-muted-foreground">
                          {" "}({event.teamName})
                        </span>
                        {event.extra && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {event.extra}
                          </Badge>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {event.minute}&apos; &middot; {timeAgo(event.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No recent activity
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
