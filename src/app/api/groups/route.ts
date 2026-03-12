import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import { groupSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const groups = await prisma.group.findMany({
      include: {
        teams: true,
        _count: {
          select: { teams: true },
        },
      },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(groups)
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
    const parsed = groupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const group = await prisma.group.create({
      data: parsed.data,
      include: { teams: true },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
