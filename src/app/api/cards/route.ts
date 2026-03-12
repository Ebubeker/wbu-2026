import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import { cardSchema } from "@/lib/validations"
import { broadcastToMatch } from "@/modules/live/sse"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = cardSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const card = await prisma.card.create({
      data: parsed.data,
      include: { player: true, team: true },
    })

    broadcastToMatch(parsed.data.matchId, {
      type: 'card_added',
      data: card,
    })

    return NextResponse.json(card, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
