import prisma from '@/lib/db'
import type { VoteCounts } from './types'

export async function getVoteCounts(matchId: string, fingerprint?: string): Promise<VoteCounts> {
  const [home, draw, away, userVoteRecord] = await Promise.all([
    prisma.matchVote.count({ where: { matchId, vote: 'HOME' } }),
    prisma.matchVote.count({ where: { matchId, vote: 'DRAW' } }),
    prisma.matchVote.count({ where: { matchId, vote: 'AWAY' } }),
    fingerprint
      ? prisma.matchVote.findUnique({
          where: { matchId_deviceFingerprint: { matchId, deviceFingerprint: fingerprint } },
          select: { vote: true },
        })
      : null,
  ])

  return {
    home,
    draw,
    away,
    total: home + draw + away,
    userVote: (userVoteRecord?.vote as VoteCounts['userVote']) ?? null,
  }
}
