'use server'

import prisma from '@/lib/db'
import { MatchStatus, CardType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { goalSchema, cardSchema } from '@/lib/validations'
import { broadcastToMatch } from './sse'
import { autoFillLineup } from '@/modules/lineups/actions'

function revalidateMatchPaths() {
  revalidatePath('/matches')
  revalidatePath('/admin/matches')
  revalidatePath('/standings')
  revalidatePath('/')
}

async function recalculateScores(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { homeTeamId: true, awayTeamId: true },
  })

  if (!match) throw new Error('Match not found')

  const goals = await prisma.goal.findMany({
    where: { matchId },
    select: { teamId: true, isOwnGoal: true },
  })

  // homeScore = goals scored by home team (not OG) + own goals by away team
  const homeScore = goals.filter(
    (g) =>
      (g.teamId === match.homeTeamId && !g.isOwnGoal) ||
      (g.teamId === match.awayTeamId && g.isOwnGoal)
  ).length

  // awayScore = goals scored by away team (not OG) + own goals by home team
  const awayScore = goals.filter(
    (g) =>
      (g.teamId === match.awayTeamId && !g.isOwnGoal) ||
      (g.teamId === match.homeTeamId && g.isOwnGoal)
  ).length

  await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore },
  })

  return { homeScore, awayScore }
}

export async function updateMatchStatus(
  matchId: string,
  status: string,
  matchMinute: number
) {
  // Auto-fill lineups when match starts
  if (status === 'FIRST_HALF') {
    const matchData = await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeTeamId: true, awayTeamId: true },
    })
    if (matchData?.homeTeamId) {
      await autoFillLineup(matchId, matchData.homeTeamId)
    }
    if (matchData?.awayTeamId) {
      await autoFillLineup(matchId, matchData.awayTeamId)
    }
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data: { status: status as MatchStatus, matchMinute },
  })

  broadcastToMatch(matchId, {
    type: 'status_change',
    data: { matchId, status, matchMinute },
  })

  if (status === 'FULL_TIME') {
    broadcastToMatch(matchId, {
      type: 'match_ended',
      data: { matchId },
    })
  }

  revalidateMatchPaths()
  return match
}

export async function updateMatchMinute(matchId: string, minute: number) {
  await prisma.match.update({
    where: { id: matchId },
    data: { matchMinute: minute },
  })

  broadcastToMatch(matchId, {
    type: 'minute_update',
    data: { matchId, minute },
  })
}

export async function addGoal(data: {
  matchId: string
  teamId: string
  playerId: string
  minute: number
  isOwnGoal: boolean
}) {
  const parsed = goalSchema.parse(data)

  const result = await prisma.$transaction(async (tx) => {
    const goal = await tx.goal.create({
      data: {
        matchId: parsed.matchId,
        teamId: parsed.teamId,
        playerId: parsed.playerId,
        minute: parsed.minute,
        isOwnGoal: parsed.isOwnGoal,
      },
      include: {
        player: { select: { id: true, name: true, number: true } },
        team: { select: { id: true, name: true } },
      },
    })

    const match = await tx.match.findUnique({
      where: { id: parsed.matchId },
      select: { homeTeamId: true, awayTeamId: true },
    })

    if (!match) throw new Error('Match not found')

    const allGoals = await tx.goal.findMany({
      where: { matchId: parsed.matchId },
      select: { teamId: true, isOwnGoal: true },
    })

    const homeScore = allGoals.filter(
      (g) =>
        (g.teamId === match.homeTeamId && !g.isOwnGoal) ||
        (g.teamId === match.awayTeamId && g.isOwnGoal)
    ).length

    const awayScore = allGoals.filter(
      (g) =>
        (g.teamId === match.awayTeamId && !g.isOwnGoal) ||
        (g.teamId === match.homeTeamId && g.isOwnGoal)
    ).length

    await tx.match.update({
      where: { id: parsed.matchId },
      data: { homeScore, awayScore },
    })

    return { goal, homeScore, awayScore }
  })

  broadcastToMatch(parsed.matchId, {
    type: 'goal_added',
    data: {
      matchId: parsed.matchId,
      goal: result.goal,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
    },
  })

  revalidateMatchPaths()
  return result
}

export async function removeGoal(goalId: string) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { matchId: true },
  })

  if (!goal) throw new Error('Goal not found')

  await prisma.goal.delete({ where: { id: goalId } })

  const scores = await recalculateScores(goal.matchId)

  broadcastToMatch(goal.matchId, {
    type: 'goal_removed',
    data: {
      matchId: goal.matchId,
      goalId,
      homeScore: scores.homeScore,
      awayScore: scores.awayScore,
    },
  })

  revalidateMatchPaths()
}

export async function editGoal(
  goalId: string,
  data: { playerId?: string; minute?: number; isOwnGoal?: boolean }
) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { matchId: true },
  })

  if (!goal) throw new Error('Goal not found')

  const updateData: Record<string, unknown> = {}
  if (data.playerId !== undefined) updateData.playerId = data.playerId
  if (data.minute !== undefined) updateData.minute = data.minute
  if (data.isOwnGoal !== undefined) updateData.isOwnGoal = data.isOwnGoal

  await prisma.goal.update({
    where: { id: goalId },
    data: updateData,
  })

  const scores = await recalculateScores(goal.matchId)

  broadcastToMatch(goal.matchId, {
    type: 'goal_added',
    data: {
      matchId: goal.matchId,
      goalId,
      homeScore: scores.homeScore,
      awayScore: scores.awayScore,
    },
  })

  revalidateMatchPaths()
}

export async function addCard(data: {
  matchId: string
  teamId: string
  playerId: string
  type: 'YELLOW' | 'RED'
  minute: number
}) {
  const parsed = cardSchema.parse(data)

  const card = await prisma.card.create({
    data: {
      matchId: parsed.matchId,
      teamId: parsed.teamId,
      playerId: parsed.playerId,
      type: parsed.type,
      minute: parsed.minute,
    },
    include: {
      player: { select: { id: true, name: true, number: true } },
      team: { select: { id: true, name: true } },
    },
  })

  broadcastToMatch(parsed.matchId, {
    type: 'card_added',
    data: { matchId: parsed.matchId, card },
  })

  revalidateMatchPaths()
  return card
}

export async function removeCard(cardId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { matchId: true },
  })

  if (!card) throw new Error('Card not found')

  await prisma.card.delete({ where: { id: cardId } })

  broadcastToMatch(card.matchId, {
    type: 'card_removed',
    data: { matchId: card.matchId, cardId },
  })

  revalidateMatchPaths()
}

export async function editCard(
  cardId: string,
  data: { playerId?: string; type?: 'YELLOW' | 'RED'; minute?: number }
) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { matchId: true },
  })

  if (!card) throw new Error('Card not found')

  const updateData: Record<string, unknown> = {}
  if (data.playerId !== undefined) updateData.playerId = data.playerId
  if (data.type !== undefined) updateData.type = data.type
  if (data.minute !== undefined) updateData.minute = data.minute

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: updateData,
    include: {
      player: { select: { id: true, name: true, number: true } },
      team: { select: { id: true, name: true } },
    },
  })

  broadcastToMatch(card.matchId, {
    type: 'card_added',
    data: { matchId: card.matchId, card: updated },
  })

  revalidateMatchPaths()
  return updated
}
