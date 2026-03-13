import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { calculateStandings } from "@/modules/standings/utils"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (groupId) {
      // Standings for a specific group
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          teams: {
            select: { id: true, name: true, shortName: true, logo: true },
          },
        },
      })

      if (!group) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 })
      }

      const matches = await prisma.match.findMany({
        where: {
          groupId,
          status: 'FULL_TIME',
        },
        select: {
          homeTeamId: true,
          awayTeamId: true,
          homeScore: true,
          awayScore: true,
          status: true,
        },
      })

      const standings = calculateStandings(group.teams, matches)

      return NextResponse.json({
        group: { id: group.id, name: group.name },
        standings,
      })
    }

    // Standings for all groups
    const groups = await prisma.group.findMany({
      include: {
        teams: {
          select: { id: true, name: true, shortName: true, logo: true },
        },
      },
      orderBy: { order: 'asc' },
    })

    const allStandings = await Promise.all(
      groups.map(async (group) => {
        const matches = await prisma.match.findMany({
          where: {
            groupId: group.id,
            status: 'FULL_TIME',
          },
          select: {
            homeTeamId: true,
            awayTeamId: true,
            homeScore: true,
            awayScore: true,
            status: true,
          },
        })

        const standings = calculateStandings(group.teams, matches)

        return {
          group: { id: group.id, name: group.name },
          standings,
        }
      })
    )

    return NextResponse.json(allStandings)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
