import prisma from '@/lib/db'
import type { LineupData } from './types'

const lineupInclude = {
  players: {
    include: {
      player: {
        select: { id: true, name: true, number: true, position: true },
      },
    },
    orderBy: { positionSlot: 'asc' as const },
  },
} as const

export async function getLineup(matchId: string, teamId: string): Promise<LineupData | null> {
  const lineup = await prisma.lineup.findUnique({
    where: { matchId_teamId: { matchId, teamId } },
    include: lineupInclude,
  })
  return lineup as unknown as LineupData | null
}

export async function getLineupsForMatch(matchId: string): Promise<LineupData[]> {
  const lineups = await prisma.lineup.findMany({
    where: { matchId },
    include: lineupInclude,
  })
  return lineups as unknown as LineupData[]
}
