'use server'

import prisma from '@/lib/db'
import { MatchStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { goalSchema, cardSchema } from '@/lib/validations'
import { broadcastToMatch } from './sse'
import { autoFillLineup } from '@/modules/lineups/actions'

function revalidateMatchPaths() {
  revalidatePath('/', 'layout')
  revalidatePath('/matches', 'layout')
  revalidatePath('/standings', 'layout')
  revalidatePath('/statistics', 'layout')
  revalidatePath('/bracket', 'layout')
  revalidatePath('/admin/matches')
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

  const homeScore = goals.filter(
    (g) =>
      (g.teamId === match.homeTeamId && !g.isOwnGoal) ||
      (g.teamId === match.awayTeamId && g.isOwnGoal)
  ).length

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

function computeMatchMinute(match: {
  status: string
  timerStartedAt: Date | null
  timerPausedAt: Date | null
  pausedElapsed: number
}): number {
  const now = new Date()
  let elapsed = 0

  if (match.timerPausedAt && match.timerStartedAt) {
    elapsed = match.timerPausedAt.getTime() - match.timerStartedAt.getTime() - match.pausedElapsed
  } else if (match.timerStartedAt) {
    elapsed = now.getTime() - match.timerStartedAt.getTime() - match.pausedElapsed
  }

  const minutes = Math.max(0, Math.min(30, Math.floor(elapsed / 60000)))
  const isSecondHalf = match.status === 'SECOND_HALF'
  return isSecondHalf ? minutes + 30 : minutes
}

export async function updateMatchStatus(
  matchId: string,
  status: string
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

  // Determine timer fields based on status transition
  const now = new Date()
  const timerData: Record<string, unknown> = {}

  if (status === 'FIRST_HALF' || status === 'SECOND_HALF') {
    timerData.timerStartedAt = now
    timerData.timerPausedAt = null
    timerData.pausedElapsed = 0
  } else if (status === 'HALF_TIME' || status === 'FULL_TIME') {
    timerData.timerStartedAt = null
    timerData.timerPausedAt = null
    timerData.pausedElapsed = 0
  }

  // Compute matchMinute snapshot
  let matchMinute = 0
  if (status === 'FIRST_HALF') matchMinute = 0
  else if (status === 'HALF_TIME') matchMinute = 30
  else if (status === 'SECOND_HALF') matchMinute = 30
  else if (status === 'FULL_TIME') matchMinute = 60

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      status: status as MatchStatus,
      matchMinute,
      ...timerData,
    },
  })

  broadcastToMatch(matchId, {
    type: 'status_change',
    data: {
      matchId,
      status,
      matchMinute,
      timerStartedAt: timerData.timerStartedAt ? (timerData.timerStartedAt as Date).toISOString() : null,
    },
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

export async function pauseTimer(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { timerPausedAt: true, timerStartedAt: true, status: true, pausedElapsed: true },
  })

  if (!match || match.timerPausedAt) return // idempotent

  const now = new Date()
  const minute = computeMatchMinute({ ...match, timerPausedAt: now })

  await prisma.match.update({
    where: { id: matchId },
    data: { timerPausedAt: now, matchMinute: minute },
  })

  broadcastToMatch(matchId, {
    type: 'timer_pause',
    data: { matchId, timerPausedAt: now.toISOString(), matchMinute: minute },
  })
}

export async function resumeTimer(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { timerPausedAt: true, timerStartedAt: true, pausedElapsed: true },
  })

  if (!match || !match.timerPausedAt) return // idempotent

  const additionalPause = new Date().getTime() - match.timerPausedAt.getTime()
  const newPausedElapsed = match.pausedElapsed + additionalPause

  await prisma.match.update({
    where: { id: matchId },
    data: { timerPausedAt: null, pausedElapsed: newPausedElapsed },
  })

  broadcastToMatch(matchId, {
    type: 'timer_resume',
    data: { matchId, pausedElapsed: newPausedElapsed },
  })
}

export async function getTimerState(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      status: true,
      matchMinute: true,
      timerStartedAt: true,
      timerPausedAt: true,
      pausedElapsed: true,
    },
  })

  if (!match) throw new Error('Match not found')
  return match
}

export async function addGoal(data: {
  matchId: string
  teamId: string
  playerId: string
  assistPlayerId?: string | null
  minute?: number
  isOwnGoal: boolean
}) {
  // Auto-compute minute from timer if not provided
  let minute = data.minute
  if (!minute) {
    const match = await prisma.match.findUnique({
      where: { id: data.matchId },
      select: { status: true, timerStartedAt: true, timerPausedAt: true, pausedElapsed: true },
    })
    if (match) {
      minute = computeMatchMinute(match)
    }
  }

  const parsed = goalSchema.parse({ ...data, minute: minute ?? 0 })

  const result = await prisma.$transaction(async (tx) => {
    const goal = await tx.goal.create({
      data: {
        matchId: parsed.matchId,
        teamId: parsed.teamId,
        playerId: parsed.playerId,
        assistPlayerId: parsed.assistPlayerId ?? null,
        minute: parsed.minute,
        isOwnGoal: parsed.isOwnGoal,
      },
      include: {
        player: { select: { id: true, name: true, number: true } },
        assistPlayer: { select: { id: true, name: true, number: true } },
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
  minute?: number
}) {
  let minute = data.minute
  if (!minute) {
    const match = await prisma.match.findUnique({
      where: { id: data.matchId },
      select: { status: true, timerStartedAt: true, timerPausedAt: true, pausedElapsed: true },
    })
    if (match) {
      minute = computeMatchMinute(match)
    }
  }

  const parsed = cardSchema.parse({ ...data, minute: minute ?? 0 })

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
