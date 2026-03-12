import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import { teamSchema } from "@/lib/validations"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        group: true,
        players: { orderBy: { number: 'asc' } },
        captain: { select: { id: true, username: true } },
      },
    })

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    return NextResponse.json(team)
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

    const isAdmin = session.role === 'ADMIN'
    const isCaptain = session.role === 'CAPTAIN' && session.teamId === id

    if (!isAdmin && !isCaptain) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    if (isCaptain && !isAdmin) {
      // Captains can only update name, shortName, description, logo
      const allowed = {
        name: body.name,
        shortName: body.shortName,
        description: body.description,
        logo: body.logo,
      }
      // Remove undefined fields
      const updateData = Object.fromEntries(
        Object.entries(allowed).filter(([_, v]) => v !== undefined)
      )

      const team = await prisma.team.update({
        where: { id },
        data: updateData,
        include: { group: true },
      })
      return NextResponse.json(team)
    }

    // Admin can update everything
    const parsed = teamSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const team = await prisma.team.update({
      where: { id },
      data: parsed.data,
      include: { group: true },
    })

    return NextResponse.json(team)
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

    await prisma.team.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
