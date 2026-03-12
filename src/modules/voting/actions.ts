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
