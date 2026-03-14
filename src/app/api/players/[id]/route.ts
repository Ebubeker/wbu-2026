import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import { playerSchema } from "@/lib/validations"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const player = await prisma.player.findUnique({
      where: { id },
      include: { team: true },
    })

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    return NextResponse.json(player)
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const isAdmin = session.role === 'ADMIN'

    if (!isAdmin) {
      // Captain can only update photo for players on their team
      if (session.role !== 'CAPTAIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const player = await prisma.player.findUnique({
        where: { id },
        select: { teamId: true },
      })

      if (!player || player.teamId !== session.teamId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const captainData: Record<string, unknown> = {}
      if (body.photo !== undefined) captainData.photo = body.photo
      if (body.position !== undefined) {
        const validPositions = ['GK', 'DEF', 'MID', 'FWD']
        if (!validPositions.includes(body.position)) {
          return NextResponse.json({ error: "Invalid position" }, { status: 400 })
        }
        captainData.position = body.position
      }

      const updated = await prisma.player.update({
        where: { id },
        data: captainData,
        include: { team: true },
      })

      return NextResponse.json(updated)
    }

    // Admin can update all fields
    const parsed = playerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const player = await prisma.player.update({
      where: { id },
      data: parsed.data,
      include: { team: true },
    })

    return NextResponse.json(player)
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

    await prisma.player.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
