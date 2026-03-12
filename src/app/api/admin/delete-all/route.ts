import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"

// POST /api/admin/delete-all — delete all data
// Permanently deletes all teams, players, matches, groups, goals, cards, and captain accounts.
// Preserves admin accounts.
export async function POST() {
  try {
    const session = await getSession()
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.$transaction([
      // Delete in dependency order
      prisma.goal.deleteMany(),
      prisma.card.deleteMany(),
      prisma.match.deleteMany(),
      prisma.player.deleteMany(),
      // Delete captain accounts (not admin accounts)
      prisma.user.deleteMany({ where: { role: "CAPTAIN" } }),
      prisma.team.deleteMany(),
      prisma.group.deleteMany(),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
