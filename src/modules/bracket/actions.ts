'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAllGroupStandings } from '@/modules/standings/queries'

function revalidateBracket() {
  revalidatePath('/bracket')
  revalidatePath('/admin/bracket')
  revalidatePath('/matches')
  revalidatePath('/')
}

/**
 * Initialize the bracket with placeholder matches.
 * SF1: A1 vs B2, SF2: B1 vs A2, Final: W-SF1 vs W-SF2
 * No actual teams assigned yet.
 */
export async function initializeBracket(): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete any existing SCHEDULED knockout matches
    await prisma.match.deleteMany({
      where: {
        stage: { in: ['SEMIFINAL', 'FINAL', 'THIRD_PLACE'] },
        status: 'SCHEDULED',
      },
    })

    const now = new Date()
    const sf1Date = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    const sf2Date = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    const finalDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000)

    await prisma.$transaction([
      prisma.match.create({
        data: {
          stage: 'SEMIFINAL',
          status: 'SCHEDULED',
          homePlaceholder: 'A1',
          awayPlaceholder: 'B2',
          matchDate: sf1Date,
        },
      }),
      prisma.match.create({
        data: {
          stage: 'SEMIFINAL',
          status: 'SCHEDULED',
          homePlaceholder: 'B1',
          awayPlaceholder: 'A2',
          matchDate: sf2Date,
        },
      }),
      prisma.match.create({
        data: {
          stage: 'FINAL',
          status: 'SCHEDULED',
          homePlaceholder: 'W-SF1',
          awayPlaceholder: 'W-SF2',
          matchDate: finalDate,
        },
      }),
    ])

    revalidateBracket()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize bracket',
    }
  }
}

/**
 * Resolve semifinal placeholders with actual teams from group standings.
 * Requires all group matches to be FULL_TIME.
 */
export async function resolveSemifinals(): Promise<{ success: boolean; error?: string }> {
  try {
    const unfinished = await prisma.match.count({
      where: { stage: 'GROUP', status: { not: 'FULL_TIME' } },
    })

    if (unfinished > 0) {
      return { success: false, error: `${unfinished} group match(es) still not finished.` }
    }

    const allStandings = await getAllGroupStandings()
    if (allStandings.length < 2) {
      return { success: false, error: 'At least 2 groups are required.' }
    }

    const groupA = allStandings[0]
    const groupB = allStandings[1]

    if (groupA.standings.length < 2 || groupB.standings.length < 2) {
      return { success: false, error: 'Each group must have at least 2 teams.' }
    }

    const a1 = groupA.standings[0].team.id
    const a2 = groupA.standings[1].team.id
    const b1 = groupB.standings[0].team.id
    const b2 = groupB.standings[1].team.id

    // Find the semifinal matches by placeholder
    const semis = await prisma.match.findMany({
      where: { stage: 'SEMIFINAL', status: 'SCHEDULED' },
      orderBy: { matchDate: 'asc' },
    })

    if (semis.length < 2) {
      return { success: false, error: 'No semifinal placeholder matches found. Initialize the bracket first.' }
    }

    // SF1: A1 vs B2
    const sf1 = semis.find((m) => m.homePlaceholder === 'A1') ?? semis[0]
    // SF2: B1 vs A2
    const sf2 = semis.find((m) => m.homePlaceholder === 'B1') ?? semis[1]

    await prisma.$transaction([
      prisma.match.update({
        where: { id: sf1.id },
        data: { homeTeamId: a1, awayTeamId: b2 },
      }),
      prisma.match.update({
        where: { id: sf2.id },
        data: { homeTeamId: b1, awayTeamId: a2 },
      }),
    ])

    revalidateBracket()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resolve semifinals',
    }
  }
}

/**
 * Resolve the final placeholder with winners of the semifinals.
 * Requires both semifinals to be FULL_TIME.
 */
export async function resolveFinal(): Promise<{ success: boolean; error?: string }> {
  try {
    const semis = await prisma.match.findMany({
      where: { stage: 'SEMIFINAL' },
      orderBy: { matchDate: 'asc' },
    })

    if (semis.length < 2) {
      return { success: false, error: 'No semifinal matches found.' }
    }

    const unfinishedSemis = semis.filter((m) => m.status !== 'FULL_TIME')
    if (unfinishedSemis.length > 0) {
      return { success: false, error: `${unfinishedSemis.length} semifinal(s) not yet finished.` }
    }

    function getWinner(match: typeof semis[0]): string | null {
      if (match.homeScore > match.awayScore) return match.homeTeamId
      if (match.awayScore > match.homeScore) return match.awayTeamId
      return null // draw — shouldn't happen in knockout but handle gracefully
    }

    const sf1 = semis.find((m) => m.homePlaceholder === 'A1') ?? semis[0]
    const sf2 = semis.find((m) => m.homePlaceholder === 'B1') ?? semis[1]

    const winnerSF1 = getWinner(sf1)
    const winnerSF2 = getWinner(sf2)

    if (!winnerSF1 || !winnerSF2) {
      return { success: false, error: 'Cannot determine winners — semifinals may have ended in a draw.' }
    }

    const finalMatch = await prisma.match.findFirst({
      where: { stage: 'FINAL', status: 'SCHEDULED' },
    })

    if (!finalMatch) {
      return { success: false, error: 'No final match placeholder found.' }
    }

    await prisma.match.update({
      where: { id: finalMatch.id },
      data: { homeTeamId: winnerSF1, awayTeamId: winnerSF2 },
    })

    revalidateBracket()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resolve final',
    }
  }
}

/**
 * Update knockout match details (date, venue).
 */
export async function updateKnockoutMatch(
  id: string,
  data: { matchDate?: string; venue?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.match.update({
      where: { id },
      data: {
        ...(data.matchDate && { matchDate: new Date(data.matchDate) }),
        ...(data.venue !== undefined && { venue: data.venue || null }),
      },
    })

    revalidateBracket()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update match',
    }
  }
}
