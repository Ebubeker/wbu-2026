import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"

// DELETE /api/auth/captains/[id] — delete a captain account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

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

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
