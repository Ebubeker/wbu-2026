'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { lineupSchema } from '@/lib/validations'
import type { Formation } from '@/lib/formations'

function revalidateLineupPaths(matchId: string) {
  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/captain/matches')
  revalidatePath('/matches')
}

export async function saveLineup(data: {
  matchId: string
  teamId: string
  formation: string
  players: Array<{ playerId: string; positionSlot: number }>
}) {
  const parsed = lineupSchema.parse(data)

  // Validate match exists, is SCHEDULED, and team is assigned
  const match = await prisma.match.findUnique({
    where: { id: parsed.matchId },
    select: { homeTeamId: true, awayTeamId: true, status: true },
  })

  if (!match) throw new Error('Match not found')
  if (match.status !== 'SCHEDULED') throw new Error('Lineup is locked — match has started')
  if (match.homeTeamId !== parsed.teamId && match.awayTeamId !== parsed.teamId) {
    throw new Error('Team is not assigned to this match')
  }

  // Validate all players belong to this team
  const playerIds = parsed.players.map((p) => p.playerId)
  const playerCount = await prisma.player.count({
    where: { id: { in: playerIds }, teamId: parsed.teamId },
  })
  if (playerCount !== 6) throw new Error('All 6 players must belong to your team')

  // Upsert lineup: delete existing players and recreate
  const existing = await prisma.lineup.findUnique({
    where: { matchId_teamId: { matchId: parsed.matchId, teamId: parsed.teamId } },
  })

  if (existing) {
    await prisma.$transaction([
      prisma.lineupPlayer.deleteMany({ where: { lineupId: existing.id } }),
      prisma.lineup.update({
        where: { id: existing.id },
        data: {
          formation: parsed.formation,
          players: {
            create: parsed.players.map((p) => ({
              playerId: p.playerId,
              positionSlot: p.positionSlot,
            })),
          },
        },
      }),
    ])
  } else {
    await prisma.lineup.create({
      data: {
        matchId: parsed.matchId,
        teamId: parsed.teamId,
        formation: parsed.formation,
        players: {
          create: parsed.players.map((p) => ({
            playerId: p.playerId,
            positionSlot: p.positionSlot,
          })),
        },
      },
    })
  }

  revalidateLineupPaths(parsed.matchId)
  return { success: true }
}

/**
 * Auto-fill lineup for a team when match goes live and no lineup was set.
 * Uses first 6 players by shirt number and team's default formation.
 */
export async function autoFillLineup(matchId: string, teamId: string) {
  const existing = await prisma.lineup.findUnique({
    where: { matchId_teamId: { matchId, teamId } },
  })

  if (existing) return // Already has a lineup

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { defaultFormation: true },
  })

  const players = await prisma.player.findMany({
    where: { teamId },
    orderBy: { number: 'asc' },
    take: 6,
    select: { id: true },
  })

  if (players.length < 6) return // Not enough players

  const formation = (team?.defaultFormation ?? '1-2-2-1') as Formation

  await prisma.lineup.create({
    data: {
      matchId,
      teamId,
      formation,
      players: {
        create: players.map((p, i) => ({
          playerId: p.id,
          positionSlot: i,
        })),
      },
    },
  })

  revalidateLineupPaths(matchId)
}
