import prisma from '@/lib/db'
import type { CompetitionData } from './types'

export async function getCompetition(): Promise<CompetitionData | null> {
  const competition = await prisma.competition.findFirst()

  if (!competition) return null

  return {
    id: competition.id,
    name: competition.name,
    season: competition.season,
    description: competition.description,
    logoUrl: competition.logoUrl,
    isActive: competition.isActive,
  }
}
