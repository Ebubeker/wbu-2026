'use server'

import prisma from '@/lib/db'
import { voteSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function castVote(
  matchId: string,
  vote: string,
  fingerprint: string,
  ipAddress: string
) {
  const parsed = voteSchema.parse({ vote, fingerprint })

  // Check match exists and is not FULL_TIME
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { status: true },
  })

  if (!match) throw new Error('Match not found')
  if (match.status === 'FULL_TIME') throw new Error('Voting is closed for this match')

  // Check if device already voted
  const existing = await prisma.matchVote.findUnique({
    where: { matchId_deviceFingerprint: { matchId, deviceFingerprint: parsed.fingerprint } },
  })

  if (existing) {
    throw new Error('You have already voted on this match')
  }

  await prisma.matchVote.create({
    data: {
      matchId,
      vote: parsed.vote,
      ipAddress,
      deviceFingerprint: parsed.fingerprint,
    },
  })

  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

export async function castMotmVote(
  matchId: string,
  playerId: string,
  fingerprint: string,
) {
  if (!fingerprint) throw new Error('Fingerprint is required')
  if (!playerId) throw new Error('Player is required')

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { status: true, homeTeamId: true, awayTeamId: true },
  })

  if (!match) throw new Error('Match not found')
  if (match.status !== 'FULL_TIME') throw new Error('MOTM voting is only available after the match ends')

  // Verify player belongs to one of the teams
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { teamId: true },
  })

  if (!player) throw new Error('Player not found')
  if (player.teamId !== match.homeTeamId && player.teamId !== match.awayTeamId) {
    throw new Error('Player is not part of this match')
  }

  const existing = await prisma.motmVote.findUnique({
    where: { matchId_deviceFingerprint: { matchId, deviceFingerprint: fingerprint } },
  })

  if (existing) throw new Error('You have already voted for MOTM')

  await prisma.motmVote.create({
    data: { matchId, playerId, deviceFingerprint: fingerprint },
  })

  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}
