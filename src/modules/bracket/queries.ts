import prisma from '@/lib/db'
import type { BracketMatch, BracketRound } from './types'

const STAGE_ORDER = ['QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL'] as const

const STAGE_LABELS: Record<string, string> = {
  QUARTERFINAL: 'Quarter-Finals',
  SEMIFINAL: 'Semi-Finals',
  THIRD_PLACE: 'Third Place',
  FINAL: 'Final',
}

export async function getKnockoutMatches(): Promise<BracketMatch[]> {
  const matches = await prisma.match.findMany({
    where: {
      stage: { not: 'GROUP' },
    },
    include: {
      homeTeam: {
        select: { id: true, name: true, shortName: true, logo: true },
      },
      awayTeam: {
        select: { id: true, name: true, shortName: true, logo: true },
      },
    },
    orderBy: [{ matchDate: 'asc' }],
  })

  return matches
    .map((match) => ({
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
    }))
    .sort((a, b) => {
      const aOrder = STAGE_ORDER.indexOf(a.stage as (typeof STAGE_ORDER)[number])
      const bOrder = STAGE_ORDER.indexOf(b.stage as (typeof STAGE_ORDER)[number])
      if (aOrder !== bOrder) return aOrder - bOrder
      return new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    })
}

export async function getBracketData(): Promise<BracketRound[]> {
  const matches = await getKnockoutMatches()

  const rounds: BracketRound[] = []

  for (const stage of STAGE_ORDER) {
    const stageMatches = matches.filter((m) => m.stage === stage)
    if (stageMatches.length > 0) {
      rounds.push({
        stage,
        label: STAGE_LABELS[stage] ?? stage,
        matches: stageMatches,
      })
    }
  }

  return rounds
}
