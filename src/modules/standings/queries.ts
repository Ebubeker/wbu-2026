import prisma from '@/lib/db'
import { calculateStandings } from './utils'
import type { StandingsRow, GroupStandings } from './types'

export async function getStandingsForGroup(groupId: string): Promise<StandingsRow[]> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      teams: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logo: true,
        },
      },
      matches: {
        where: { status: 'FULL_TIME' },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
          status: true,
        },
      },
    },
  })

  if (!group) return []

  return calculateStandings(group.teams, group.matches)
}

export async function getAllGroupStandings(): Promise<GroupStandings[]> {
  const groups = await prisma.group.findMany({
    include: {
      teams: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logo: true,
        },
      },
      matches: {
        where: { status: 'FULL_TIME' },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
          status: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  })

  return groups.map((group) => ({
    group: {
      id: group.id,
      name: group.name,
      order: group.order,
    },
    standings: calculateStandings(group.teams, group.matches),
  }))
}
