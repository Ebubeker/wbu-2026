import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: { teams: true },
    })

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    if (group.teams.length < 2) {
      return NextResponse.json({ error: "Group must have at least 2 teams" }, { status: 400 })
    }

    const teams = group.teams

    // Generate round-robin pairs
    const matchPairs: { homeTeamId: string; awayTeamId: string }[] = []
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matchPairs.push({
          homeTeamId: teams[i].id,
          awayTeamId: teams[j].id,
        })
      }
    }

    // Use a transaction: delete existing SCHEDULED matches for this group, then create new ones
    const baseDate = new Date()
    const createdMatches = await prisma.$transaction(async (tx) => {
      // Delete all SCHEDULED matches for this group
      await tx.match.deleteMany({
        where: {
          groupId: id,
          status: 'SCHEDULED',
        },
      })

      // Create round-robin matches
      const matches = []
      for (let i = 0; i < matchPairs.length; i++) {
        const matchDate = new Date(baseDate)
        matchDate.setDate(matchDate.getDate() + i * 2)

        const match = await tx.match.create({
          data: {
            homeTeamId: matchPairs[i].homeTeamId,
            awayTeamId: matchPairs[i].awayTeamId,
            groupId: id,
            stage: 'GROUP',
            status: 'SCHEDULED',
            matchDate,
            homeScore: 0,
            awayScore: 0,
          },
          include: {
            homeTeam: { select: { id: true, name: true, shortName: true } },
            awayTeam: { select: { id: true, name: true, shortName: true } },
          },
        })
        matches.push(match)
      }

      return matches
    })

    return NextResponse.json(createdMatches, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
