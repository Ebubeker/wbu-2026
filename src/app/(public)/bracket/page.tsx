import prisma from "@/lib/db"
import { PageHeader } from "@/components/common/PageHeader"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { BracketView } from "@/modules/bracket/components/BracketView"
import type { BracketRound } from "@/modules/bracket/types"

export const dynamic = 'force-dynamic'

const STAGE_LABELS: Record<string, string> = {
  QUARTERFINAL: "Quarter-Finals",
  SEMIFINAL: "Semi-Finals",
  THIRD_PLACE: "Third Place",
  FINAL: "Final",
}

const STAGE_ORDER: Record<string, number> = {
  QUARTERFINAL: 1,
  SEMIFINAL: 2,
  THIRD_PLACE: 3,
  FINAL: 4,
}

export default async function BracketPage() {
  const matches = await prisma.match.findMany({
    where: {
      stage: { not: "GROUP" },
    },
    orderBy: [{ stage: "asc" }, { matchDate: "asc" }],
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
      awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
    },
  })

  const roundsMap = new Map<string, BracketRound>()

  for (const match of matches) {
    const stage = match.stage
    if (!roundsMap.has(stage)) {
      roundsMap.set(stage, {
        stage,
        label: STAGE_LABELS[stage] ?? stage.replace("_", " "),
        matches: [],
      })
    }
    roundsMap.get(stage)!.matches.push({
      id: match.id,
      homeTeam: match.homeTeam ?? null,
      awayTeam: match.awayTeam ?? null,
      homePlaceholder: match.homePlaceholder,
      awayPlaceholder: match.awayPlaceholder,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      stage: match.stage,
      matchDate: match.matchDate,
      venue: match.venue,
    })
  }

  const rounds = Array.from(roundsMap.values()).sort(
    (a, b) => (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99)
  )

  return (
    <PublicLayout contentClassName="max-w-7xl">
      <div className="space-y-6">
        <PageHeader
          title="Knockout Bracket"
          description="Elimination stage matches"
        />
        <BracketView rounds={rounds} />
      </div>
    </PublicLayout>
  )
}
