'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { matchSchema } from '@/lib/validations'
import type { MatchFormValues } from './types'

function revalidateMatchPaths() {
  revalidatePath('/', 'layout')
  revalidatePath('/matches', 'layout')
  revalidatePath('/standings', 'layout')
  revalidatePath('/statistics', 'layout')
  revalidatePath('/bracket', 'layout')
  revalidatePath('/admin/matches')
}

export async function createMatch(data: MatchFormValues) {
  const parsed = matchSchema.parse(data)

  if (parsed.homeTeamId === parsed.awayTeamId) {
    throw new Error('Home team and away team must be different')
  }

  const match = await prisma.match.create({
    data: {
      homeTeamId: parsed.homeTeamId,
      awayTeamId: parsed.awayTeamId,
      stage: parsed.stage,
      groupId: parsed.groupId ?? null,
      matchDate: new Date(parsed.matchDate),
      venue: parsed.venue ?? null,
      status: 'SCHEDULED',
      homeScore: 0,
      awayScore: 0,
      matchMinute: 0,
    },
  })

  revalidateMatchPaths()
  return match
}

export async function updateMatch(id: string, data: Partial<MatchFormValues>) {
  const updateData: Record<string, unknown> = {}

  if (data.homeTeamId !== undefined) updateData.homeTeamId = data.homeTeamId
  if (data.awayTeamId !== undefined) updateData.awayTeamId = data.awayTeamId
  if (data.stage !== undefined) updateData.stage = data.stage
  if (data.groupId !== undefined) updateData.groupId = data.groupId ?? null
  if (data.matchDate !== undefined) updateData.matchDate = new Date(data.matchDate)
  if (data.venue !== undefined) updateData.venue = data.venue ?? null

  if (
    updateData.homeTeamId &&
    updateData.awayTeamId &&
    updateData.homeTeamId === updateData.awayTeamId
  ) {
    throw new Error('Home team and away team must be different')
  }

  const match = await prisma.match.update({
    where: { id },
    data: updateData,
  })

  revalidateMatchPaths()
  return match
}

export async function deleteMatch(id: string) {
  const match = await prisma.match.findUnique({ where: { id } })

  if (!match) {
    throw new Error('Match not found')
  }

  if (match.status !== 'SCHEDULED') {
    throw new Error('Only scheduled matches can be deleted')
  }

  await prisma.match.delete({ where: { id } })

  revalidateMatchPaths()
}

export async function bulkCreateMatches(matches: MatchFormValues[]) {
  const parsedMatches = matches.map((m) => {
    const parsed = matchSchema.parse(m)
    if (parsed.homeTeamId === parsed.awayTeamId) {
      throw new Error('Home team and away team must be different')
    }
    return parsed
  })

  const result = await prisma.$transaction(
    parsedMatches.map((parsed) =>
      prisma.match.create({
        data: {
          homeTeamId: parsed.homeTeamId,
          awayTeamId: parsed.awayTeamId,
          stage: parsed.stage,
          groupId: parsed.groupId ?? null,
          matchDate: new Date(parsed.matchDate),
          venue: parsed.venue ?? null,
          status: 'SCHEDULED',
          homeScore: 0,
          awayScore: 0,
          matchMinute: 0,
        },
      })
    )
  )

  revalidateMatchPaths()
  return result
}
