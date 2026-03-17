import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: {
          include: { players: { orderBy: { number: 'asc' } } },
        },
        awayTeam: {
          include: { players: { orderBy: { number: 'asc' } } },
        },
        group: true,
        goals: {
          include: { player: true, assistPlayer: true, team: true },
          orderBy: { minute: 'asc' },
        },
        cards: {
          include: { player: true, team: true },
          orderBy: { minute: 'asc' },
        },
        lineups: {
          include: {
            players: {
              include: { player: true },
              orderBy: { positionSlot: 'asc' },
            },
          },
        },
      },
    })

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    return NextResponse.json(match)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
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

    const updateData: Record<string, unknown> = {}
    if (body.homeTeamId !== undefined) updateData.homeTeamId = body.homeTeamId
    if (body.awayTeamId !== undefined) updateData.awayTeamId = body.awayTeamId
    if (body.stage !== undefined) updateData.stage = body.stage
    if (body.groupId !== undefined) updateData.groupId = body.groupId
    if (body.matchDate !== undefined) updateData.matchDate = new Date(body.matchDate)
    if (body.venue !== undefined) updateData.venue = body.venue
    if (body.status !== undefined) updateData.status = body.status
    if (body.homeScore !== undefined) updateData.homeScore = body.homeScore
    if (body.awayScore !== undefined) updateData.awayScore = body.awayScore
    if (body.matchMinute !== undefined) updateData.matchMinute = body.matchMinute

    const match = await prisma.match.update({
      where: { id },
      data: updateData,
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true } },
        awayTeam: { select: { id: true, name: true, shortName: true } },
        group: true,
      },
    })

    return NextResponse.json(match)
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

    const match = await prisma.match.findUnique({ where: { id } })
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    if (match.status !== 'SCHEDULED') {
      return NextResponse.json({ error: "Only scheduled matches can be deleted" }, { status: 400 })
    }

    await prisma.match.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
