import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"

// POST /api/admin/reset-matches — reset all match results
// Sets all matches back to SCHEDULED with 0-0 scores, deletes all goals and cards.
export async function POST() {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.$transaction([
      // Delete all goals
      prisma.goal.deleteMany(),
      // Delete all cards
      prisma.card.deleteMany(),
      // Reset all matches to SCHEDULED with 0-0
      prisma.match.updateMany({
        data: {
          status: "SCHEDULED",
          homeScore: 0,
          awayScore: 0,
          matchMinute: 0,
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
