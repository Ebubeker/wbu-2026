import prisma from '@/lib/db'

export async function getGroups() {
  return prisma.group.findMany({
    include: {
      teams: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logo: true,
        },
        orderBy: { name: 'asc' },
      },
      _count: {
        select: { matches: true, teams: true },
      },
    },
    orderBy: { order: 'asc' },
  })
}

export async function getGroupById(id: string) {
  return prisma.group.findUnique({
    where: { id },
    include: {
      teams: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logo: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  })
}

export async function getGroupWithTeamsAndMatches(id: string) {
  return prisma.group.findUnique({
    where: { id },
    include: {
      teams: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logo: true,
        },
        orderBy: { name: 'asc' },
      },
      matches: {
        include: {
          homeTeam: {
            select: { id: true, name: true, shortName: true, logo: true },
          },
          awayTeam: {
            select: { id: true, name: true, shortName: true, logo: true },
          },
        },
        orderBy: { matchDate: 'asc' },
      },
    },
  })
}
