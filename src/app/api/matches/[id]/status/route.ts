import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import { broadcastToMatch } from "@/modules/live/sse"

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
    const { status, matchMinute } = body

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status }
    if (matchMinute !== undefined) {
      updateData.matchMinute = matchMinute
    }

    const match = await prisma.match.update({
      where: { id },
      data: updateData,
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true } },
        awayTeam: { select: { id: true, name: true, shortName: true } },
      },
    })

    broadcastToMatch(id, {
      type: 'status_change',
      data: {
        matchId: id,
        status: match.status,
        matchMinute: match.matchMinute,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
    })

    return NextResponse.json(match)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
