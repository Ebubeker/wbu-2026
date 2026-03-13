import Link from "next/link"
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  GitBranch,
  TableProperties,
  Trophy,
  Users,
} from "lucide-react"
import prisma from "@/lib/db"
import { formatDate, formatTime } from "@/lib/utils"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { MatchCard } from "@/modules/matches/components/MatchCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/common/EmptyState"
import type { MatchData } from "@/modules/matches/types"

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [competition, liveMatches, upcomingMatches, recentResults] =
    await Promise.all([
      prisma.competition.findFirst(),
      prisma.match.findMany({
        where: { status: { in: ["FIRST_HALF", "HALF_TIME", "SECOND_HALF"] }, homeTeamId: { not: null }, awayTeamId: { not: null } },
        orderBy: { matchDate: "asc" },
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
          group: { select: { id: true, name: true } },
        },
      }),
      prisma.match.findMany({
        where: { status: "SCHEDULED", homeTeamId: { not: null }, awayTeamId: { not: null } },
        orderBy: { matchDate: "asc" },
        take: 4,
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
          group: { select: { id: true, name: true } },
        },
      }),
      prisma.match.findMany({
        where: { status: "FULL_TIME", homeTeamId: { not: null }, awayTeamId: { not: null } },
        orderBy: { matchDate: "desc" },
        take: 3,
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
          group: { select: { id: true, name: true } },
        },
      }),
    ])

  const competitionName = competition?.name ?? "WBU 2026 Championship"
  // Cast - these queries filter out null teams
  const safeLive = liveMatches.filter((m) => m.homeTeam && m.awayTeam) as unknown as MatchData[]
  const safeUpcoming = upcomingMatches.filter((m) => m.homeTeam && m.awayTeam) as unknown as MatchData[]
  const safeResults = recentResults.filter((m) => m.homeTeam && m.awayTeam) as unknown as MatchData[]
  const hasLive = safeLive.length > 0

  const quickLinks = [
    { href: "/standings", label: "Standings", icon: TableProperties },
    { href: "/teams", label: "Teams", icon: Users },
    { href: "/bracket", label: "Bracket", icon: GitBranch },
    { href: "/matches", label: "Matches", icon: CalendarDays },
  ]

  return (
    <PublicLayout contentClassName="max-w-3xl">
      <div className="space-y-8">
        {/* Header */}
        <section>
          <h1 className="text-2xl font-bold text-foreground">
            {competitionName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasLive
              ? `${liveMatches.length} match${safeLive.length > 1 ? "es" : ""} live now`
              : "Follow fixtures, results, and standings."}
          </p>
        </section>

        {/* Quick navigation */}
        <section className="flex gap-2 overflow-x-auto">
          {quickLinks.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </Link>
            )
          })}
        </section>

        {/* Live matches */}
        {hasLive && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse-live rounded-full bg-red-500" />
                <h2 className="text-sm font-semibold text-foreground">Live now</h2>
              </div>
              <Link href="/matches" className="text-sm text-primary hover:underline">
                All matches
              </Link>
            </div>
            <div className="space-y-3">
              {safeLive.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming fixtures */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Upcoming</h2>
            <Link href="/matches" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>

          {safeUpcoming.length > 0 ? (
            <div className="space-y-3">
              {safeUpcoming.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Clock3}
              title="No fixtures yet"
              description="Upcoming matches will appear here when scheduled."
            />
          )}
        </section>

        {/* Recent results */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent results</h2>
            <Link href="/matches" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>

          {safeResults.length > 0 ? (
            <div className="space-y-3">
              {safeResults.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Trophy}
              title="No results yet"
              description="Completed matches will appear here."
            />
          )}
        </section>
      </div>
    </PublicLayout>
  )
}
