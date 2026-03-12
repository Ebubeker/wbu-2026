import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import { broadcastToMatch } from "@/modules/live/sse"

async function recalculateScores(tx: any, matchId: string, homeTeamId: string, awayTeamId: string) {
  const homeScore = await tx.goal.count({
    where: {
      matchId,
      OR: [
        { teamId: homeTeamId, isOwnGoal: false },
        { teamId: awayTeamId, isOwnGoal: true },
      ],
    },
  })

  const awayScore = await tx.goal.count({
    where: {
      matchId,
      OR: [
        { teamId: awayTeamId, isOwnGoal: false },
        { teamId: homeTeamId, isOwnGoal: true },
      ],
    },
  })

  await tx.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore },
  })

  return { homeScore, awayScore }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const existingGoal = await prisma.goal.findUnique({
      where: { id },
      include: { match: true },
    })

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.update({
        where: { id },
        data: {
          teamId: body.teamId,
          playerId: body.playerId,
          minute: body.minute,
          isOwnGoal: body.isOwnGoal,
        },
        include: { player: true, team: true },
      })

      const scores = await recalculateScores(
        tx,
        existingGoal.matchId,
        existingGoal.match.homeTeamId!,
        existingGoal.match.awayTeamId!
      )

      return { goal, ...scores }
    })

    broadcastToMatch(existingGoal.matchId, {
      type: 'goal_added',
      data: {
        goal: result.goal,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingGoal = await prisma.goal.findUnique({
      where: { id },
      include: { match: true },
    })

    if (!existingGoal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.goal.delete({ where: { id } })

      const scores = await recalculateScores(
        tx,
        existingGoal.matchId,
        existingGoal.match.homeTeamId!,
        existingGoal.match.awayTeamId!
      )

      return scores
    })

    broadcastToMatch(existingGoal.matchId, {
      type: 'goal_removed',
      data: {
        goalId: id,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
      },
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
