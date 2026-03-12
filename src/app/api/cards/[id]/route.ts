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

    const card = await prisma.card.update({
      where: { id },
      data: {
        teamId: body.teamId,
        playerId: body.playerId,
        type: body.type,
        minute: body.minute,
      },
      include: { player: true, team: true },
    })

    broadcastToMatch(card.matchId, {
      type: 'card_added',
      data: card,
    })

    return NextResponse.json(card)
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

    const card = await prisma.card.findUnique({ where: { id } })
    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 })
    }

    await prisma.card.delete({ where: { id } })

    broadcastToMatch(card.matchId, {
      type: 'card_removed',
      data: { cardId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
