import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { SALT_ROUNDS } from "@/lib/constants"

// POST /api/auth/captains/[id]/reset-password — reset a captain's password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    if (!body.password || typeof body.password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      )
    }

    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const captain = await prisma.user.findUnique({
      where: { id },
    })

    if (!captain) {
      return NextResponse.json(
        { error: "Captain not found" },
        { status: 404 }
      )
    }

    if (captain.role !== "CAPTAIN") {
      return NextResponse.json(
        { error: "User is not a captain" },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS)

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
