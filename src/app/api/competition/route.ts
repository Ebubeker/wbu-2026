import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import { competitionSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const competition = await prisma.competition.findFirst()
    return NextResponse.json(competition)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = competitionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const existing = await prisma.competition.findFirst()

    const competition = await prisma.competition.upsert({
      where: { id: existing?.id ?? '' },
      create: parsed.data,
      update: parsed.data,
    })

    return NextResponse.json(competition)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
