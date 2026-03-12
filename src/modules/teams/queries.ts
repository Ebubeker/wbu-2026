import prisma from '@/lib/db'

export async function getTeams() {
  return prisma.team.findMany({
    include: {
      group: {
        select: { id: true, name: true },
      },
      _count: {
        select: { players: true },
      },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getTeamById(id: string) {
  return prisma.team.findUnique({
    where: { id },
    include: {
      group: {
        select: { id: true, name: true },
      },
    },
  })
}

export async function getTeamWithPlayersAndMatches(id: string) {
  return prisma.team.findUnique({
    where: { id },
    include: {
      group: {
        select: { id: true, name: true },
      },
      players: {
        orderBy: { number: 'asc' },
      },
      captain: {
        select: { id: true, username: true },
      },
      homeMatches: {
        include: {
          awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
          goals: true,
          cards: true,
        },
        orderBy: { matchDate: 'desc' },
      },
      awayMatches: {
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
          goals: true,
          cards: true,
        },
        orderBy: { matchDate: 'desc' },
      },
    },
  })
}
