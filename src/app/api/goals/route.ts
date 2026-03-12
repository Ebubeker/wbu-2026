import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import { goalSchema } from "@/lib/validations"
import { broadcastToMatch } from "@/modules/live/sse"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = goalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const { matchId, teamId, playerId, minute, isOwnGoal } = parsed.data

    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the goal
      const goal = await tx.goal.create({
        data: { matchId, teamId, playerId, minute, isOwnGoal },
        include: { player: true, team: true },
      })

      // Recalculate home score:
      // Goals scored by home team (not own goals) + own goals by away team
      const homeScore = await tx.goal.count({
        where: {
          matchId,
          OR: [
            { teamId: match.homeTeamId!, isOwnGoal: false },
            { teamId: match.awayTeamId!, isOwnGoal: true },
          ],
        },
      })

      // Recalculate away score:
      // Goals scored by away team (not own goals) + own goals by home team
      const awayScore = await tx.goal.count({
        where: {
          matchId,
          OR: [
            { teamId: match.awayTeamId!, isOwnGoal: false },
            { teamId: match.homeTeamId!, isOwnGoal: true },
          ],
        },
      })

      // Update match scores
      await tx.match.update({
        where: { id: matchId },
        data: { homeScore, awayScore },
      })

      return { goal, homeScore, awayScore }
    })

    broadcastToMatch(matchId, {
      type: 'goal_added',
      data: {
        goal: result.goal,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
