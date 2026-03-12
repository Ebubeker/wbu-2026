import prisma from '@/lib/db'

export async function getPlayersByTeam(teamId: string) {
  return prisma.player.findMany({
    where: { teamId },
    include: {
      team: {
        select: { id: true, name: true, shortName: true },
      },
    },
    orderBy: { number: 'asc' },
  })
}

export async function getPlayerById(id: string) {
  return prisma.player.findUnique({
    where: { id },
    include: {
      team: {
        select: { id: true, name: true, shortName: true },
      },
    },
  })
}

export async function getTopScorers(limit: number = 10) {
  return prisma.player.findMany({
    include: {
      team: {
        select: { id: true, name: true, shortName: true },
      },
      _count: {
        select: { goals: true },
      },
    },
    orderBy: {
      goals: { _count: 'desc' },
    },
    take: limit,
  })
}
