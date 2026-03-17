import prisma from '@/lib/db'
import type { MatchData, MatchWithEvents, MatchFilters } from './types'

const teamSelect = {
  id: true,
  name: true,
  shortName: true,
  logo: true,
} as const

const teamWithPlayersSelect = {
  id: true,
  name: true,
  shortName: true,
  logo: true,
  players: {
    select: {
      id: true,
      name: true,
      number: true,
      position: true,
    },
    orderBy: { number: 'asc' as const },
  },
} as const

export async function getMatches(filters?: MatchFilters): Promise<MatchData[]> {
  const where: Record<string, unknown> = {}

  if (filters?.stage) {
    where.stage = filters.stage
  }
  if (filters?.status) {
    where.status = filters.status
  }
  if (filters?.groupId) {
    where.groupId = filters.groupId
  }

  const matches = await prisma.match.findMany({
    where,
    include: {
      homeTeam: { select: teamSelect },
      awayTeam: { select: teamSelect },
      group: { select: { id: true, name: true } },
    },
    orderBy: { matchDate: 'asc' },
  })

  return matches as unknown as MatchData[]
}

export async function getMatchById(id: string): Promise<MatchWithEvents | null> {
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: {
        select: {
          ...teamWithPlayersSelect,
          kits: { where: { type: 'HOME' }, select: { primaryColor: true, secondaryColor: true, pattern: true } },
        },
      },
      awayTeam: {
        select: {
          ...teamWithPlayersSelect,
          kits: { where: { type: 'AWAY' }, select: { primaryColor: true, secondaryColor: true, pattern: true } },
        },
      },
      group: { select: { id: true, name: true } },
      goals: {
        include: {
          player: { select: { id: true, name: true, number: true } },
          assistPlayer: { select: { id: true, name: true, number: true } },
          team: { select: { id: true, name: true } },
        },
        orderBy: { minute: 'asc' },
      },
      cards: {
        include: {
          player: { select: { id: true, name: true, number: true } },
          team: { select: { id: true, name: true } },
        },
        orderBy: { minute: 'asc' },
      },
      lineups: {
        include: {
          players: {
            include: {
              player: { select: { id: true, name: true, number: true, position: true } },
            },
            orderBy: { positionSlot: 'asc' as const },
          },
        },
      },
    },
  })

  return match as unknown as MatchWithEvents | null
}

export async function getMatchesByTeam(teamId: string): Promise<MatchData[]> {
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    include: {
      homeTeam: { select: teamSelect },
      awayTeam: { select: teamSelect },
      group: { select: { id: true, name: true } },
    },
    orderBy: { matchDate: 'asc' },
  })

  return matches as unknown as MatchData[]
}

export async function getLiveMatches(): Promise<MatchData[]> {
  const matches = await prisma.match.findMany({
    where: {
      status: { in: ['FIRST_HALF', 'HALF_TIME', 'SECOND_HALF'] },
    },
    include: {
      homeTeam: { select: teamSelect },
      awayTeam: { select: teamSelect },
      group: { select: { id: true, name: true } },
    },
    orderBy: { matchDate: 'asc' },
  })

  return matches as unknown as MatchData[]
}

export async function getUpcomingMatches(limit?: number): Promise<MatchData[]> {
  const matches = await prisma.match.findMany({
    where: { status: 'SCHEDULED' },
    include: {
      homeTeam: { select: teamSelect },
      awayTeam: { select: teamSelect },
      group: { select: { id: true, name: true } },
    },
    orderBy: { matchDate: 'asc' },
    ...(limit ? { take: limit } : {}),
  })

  return matches as unknown as MatchData[]
}

export async function getRecentResults(limit?: number): Promise<MatchData[]> {
  const matches = await prisma.match.findMany({
    where: { status: 'FULL_TIME' },
    include: {
      homeTeam: { select: teamSelect },
      awayTeam: { select: teamSelect },
      group: { select: { id: true, name: true } },
    },
    orderBy: { matchDate: 'desc' },
    ...(limit ? { take: limit } : {}),
  })

  return matches as unknown as MatchData[]
}
