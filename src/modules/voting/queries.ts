import prisma from '@/lib/db'
import type { VoteCounts, MotmResult } from './types'

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

export async function getMotmResults(matchId: string, fingerprint?: string): Promise<MotmResult> {
  const [votes, userVoteRecord] = await Promise.all([
    prisma.motmVote.findMany({
      where: { matchId },
      include: {
        player: {
          select: { id: true, name: true, number: true, team: { select: { id: true, name: true } } },
        },
      },
    }),
    fingerprint
      ? prisma.motmVote.findUnique({
          where: { matchId_deviceFingerprint: { matchId, deviceFingerprint: fingerprint } },
          select: { playerId: true },
        })
      : null,
  ])

  // Aggregate votes per player
  const playerMap = new Map<string, { playerId: string; playerName: string; playerNumber: number; teamName: string; teamId: string; votes: number }>()
  for (const v of votes) {
    const existing = playerMap.get(v.playerId)
    if (existing) {
      existing.votes++
    } else {
      playerMap.set(v.playerId, {
        playerId: v.player.id,
        playerName: v.player.name,
        playerNumber: v.player.number,
        teamName: v.player.team.name,
        teamId: v.player.team.id,
        votes: 1,
      })
    }
  }

  const candidates = Array.from(playerMap.values()).sort((a, b) => b.votes - a.votes)

  return {
    candidates,
    total: votes.length,
    userVote: userVoteRecord?.playerId ?? null,
  }
}
