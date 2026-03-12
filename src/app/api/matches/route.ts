import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import { matchSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const status = searchParams.get('status')
    const groupId = searchParams.get('groupId')

    const where: Record<string, unknown> = {}
    if (stage) where.stage = stage
    if (status) where.status = status
    if (groupId) where.groupId = groupId

    const matches = await prisma.match.findMany({
      where,
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        group: true,
      },
      orderBy: { matchDate: 'asc' },
    })

    return NextResponse.json(matches)
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
    const parsed = matchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const match = await prisma.match.create({
      data: {
        ...parsed.data,
        matchDate: new Date(parsed.data.matchDate),
        homeScore: 0,
        awayScore: 0,
        status: 'SCHEDULED',
      },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true } },
        awayTeam: { select: { id: true, name: true, shortName: true } },
        group: true,
      },
    })

    return NextResponse.json(match, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
