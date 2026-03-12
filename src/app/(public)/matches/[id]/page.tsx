import type { Metadata } from "next"
import { notFound } from "next/navigation"
import prisma from "@/lib/db"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { MatchDetail } from "@/modules/matches/components/MatchDetail"

export const dynamic = 'force-dynamic'

interface MatchPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: MatchPageProps): Promise<Metadata> {
  const { id } = await params
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  })

  if (!match) {
    return { title: "Match Not Found" }
  }

  const home = match.homeTeam?.name ?? match.homePlaceholder ?? 'TBD'
  const away = match.awayTeam?.name ?? match.awayPlaceholder ?? 'TBD'

  return {
    title: `${home} vs ${away} | WBU 2026`,
    description: `${home} vs ${away} - WBU 2026 Championship`,
  }
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logo: true,
          players: {
            select: { id: true, name: true, number: true, position: true },
            orderBy: { number: "asc" },
          },
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logo: true,
          players: {
            select: { id: true, name: true, number: true, position: true },
            orderBy: { number: "asc" },
          },
        },
      },
      goals: {
        include: {
          player: { select: { id: true, name: true, number: true } },
          team: { select: { id: true, name: true } },
        },
        orderBy: { minute: "asc" },
      },
      cards: {
        include: {
          player: { select: { id: true, name: true, number: true } },
          team: { select: { id: true, name: true } },
        },
        orderBy: { minute: "asc" },
      },
      group: { select: { id: true, name: true } },
    },
  })

  if (!match || !match.homeTeam || !match.awayTeam) {
    notFound()
  }

  const matchData = {
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    stage: match.stage,
    matchDate: match.matchDate.toISOString(),
    venue: match.venue,
    matchMinute: match.matchMinute,
    groupId: match.groupId,
    group: match.group,
    goals: match.goals.map((g) => ({
      id: g.id,
      minute: g.minute,
      isOwnGoal: g.isOwnGoal,
      player: g.player,
      team: g.team,
    })),
    cards: match.cards.map((c) => ({
      id: c.id,
      minute: c.minute,
      type: c.type as "YELLOW" | "RED",
      player: c.player,
      team: c.team,
    })),
  }

  return (
    <PublicLayout maxWidthClassName="max-w-5xl">
      <div>
        <MatchDetail match={matchData} />
      </div>
    </PublicLayout>
  )
}
