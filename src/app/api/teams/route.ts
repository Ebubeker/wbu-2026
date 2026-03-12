import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import { teamSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const teams = await prisma.team.findMany({
      include: {
        group: true,
        _count: {
          select: { players: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(teams)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = teamSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const team = await prisma.team.create({
      data: parsed.data,
      include: { group: true },
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
