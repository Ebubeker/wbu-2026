import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import { captainSchema } from "@/lib/validations"
import bcrypt from "bcryptjs"
import { SALT_ROUNDS } from "@/lib/constants"

// GET /api/auth/captains — list all captain accounts
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const captains = await prisma.user.findMany({
      where: { role: "CAPTAIN" },
      select: {
        id: true,
        username: true,
        teamId: true,
        team: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(captains)
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/auth/captains — create a new captain account
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // The settings page sends teamId as undefined or "none" when no team is selected.
    // captainSchema requires a uuid teamId, so we validate conditionally.
    const teamId =
      body.teamId && body.teamId !== "none" ? body.teamId : undefined

    const parsed = captainSchema.safeParse({ ...body, teamId })

    // If teamId was not provided, validate only username + password
    if (!teamId) {
      if (!body.username || body.username.length < 3) {
        return NextResponse.json(
          { error: "Username must be at least 3 characters" },
          { status: 400 }
        )
      }
      if (!body.password || body.password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        )
      }
    } else if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Check for duplicate username
    const existing = await prisma.user.findUnique({
      where: { username: body.username.trim() },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      )
    }

    // If a teamId is provided, check it's not already assigned to another captain
    if (teamId) {
      const existingCaptain = await prisma.user.findUnique({
        where: { teamId },
      })
      if (existingCaptain) {
        return NextResponse.json(
          { error: "This team already has a captain assigned" },
          { status: 409 }
        )
      }
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS)

    const captain = await prisma.user.create({
      data: {
        username: body.username.trim(),
        passwordHash,
        role: "CAPTAIN",
        teamId: teamId || null,
      },
      select: {
        id: true,
        username: true,
        teamId: true,
        team: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(captain, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
