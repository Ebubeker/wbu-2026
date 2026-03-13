import { unstable_cache } from 'next/cache'
import prisma from '@/lib/db'
import { POINTS_WIN, POINTS_DRAW } from '@/lib/constants'
import type {
  CompetitionStats,
  TopScorer,
  MostCardedPlayer,
  TeamRanking,
  MatchRecord,
  PlayerStats,
  PlayerMatchEntry,
  TeamStats,
} from './types'

const CACHE_TTL = 30 // seconds

async function _getCompetitionStats(): Promise<CompetitionStats> {
  const [totalMatches, completedMatches, totalGoals, cards] = await Promise.all([
    prisma.match.count(),
    prisma.match.count({ where: { status: 'FULL_TIME' } }),
    prisma.goal.count(),
    prisma.card.groupBy({
      by: ['type'],
      _count: true,
    }),
  ])

  const yellowCards = cards.find((c) => c.type === 'YELLOW')?._count ?? 0
  const redCards = cards.find((c) => c.type === 'RED')?._count ?? 0
  const avgGoalsPerMatch = completedMatches > 0 ? Math.round((totalGoals / completedMatches) * 10) / 10 : 0

  return {
    totalMatches,
    completedMatches,
    scheduledMatches: totalMatches - completedMatches,
    totalGoals,
    totalYellowCards: yellowCards,
    totalRedCards: redCards,
    avgGoalsPerMatch,
  }
}

export const getCompetitionStats = unstable_cache(
  _getCompetitionStats,
  ['competition-stats'],
  { revalidate: CACHE_TTL }
)

async function _getTopScorers(limit = 10): Promise<TopScorer[]> {
  const scorers = await prisma.goal.groupBy({
    by: ['playerId'],
    where: { isOwnGoal: false },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  })

  if (scorers.length === 0) return []

  const players = await prisma.player.findMany({
    where: { id: { in: scorers.map((s) => s.playerId) } },
    select: {
      id: true,
      name: true,
      number: true,
      photo: true,
      team: { select: { id: true, name: true, shortName: true, logo: true } },
    },
  })

  const playerMap = new Map(players.map((p) => [p.id, p]))

  return scorers
    .map((s) => {
      const player = playerMap.get(s.playerId)
      if (!player) return null
      return {
        playerId: player.id,
        playerName: player.name,
        playerNumber: player.number,
        playerPhoto: player.photo,
        teamId: player.team.id,
        teamName: player.team.name,
        teamShortName: player.team.shortName,
        teamLogo: player.team.logo,
        goals: s._count.id,
      }
    })
    .filter((s): s is TopScorer => s !== null)
}

export const getTopScorers = (limit = 10) =>
  unstable_cache(
    () => _getTopScorers(limit),
    [`top-scorers-${limit}`],
    { revalidate: CACHE_TTL }
  )()

async function _getMostCardedPlayers(limit = 10): Promise<MostCardedPlayer[]> {
  const carded = await prisma.card.groupBy({
    by: ['playerId', 'type'],
    _count: { id: true },
  })

  // Aggregate per player
  const playerCards = new Map<string, { yellow: number; red: number }>()
  for (const c of carded) {
    const existing = playerCards.get(c.playerId) ?? { yellow: 0, red: 0 }
    if (c.type === 'YELLOW') existing.yellow += c._count.id
    else existing.red += c._count.id
    playerCards.set(c.playerId, existing)
  }

  // Sort by total cards
  const sorted = Array.from(playerCards.entries())
    .map(([playerId, cards]) => ({
      playerId,
      total: cards.yellow + cards.red,
      ...cards,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)

  if (sorted.length === 0) return []

  const players = await prisma.player.findMany({
    where: { id: { in: sorted.map((s) => s.playerId) } },
    select: {
      id: true,
      name: true,
      number: true,
      team: { select: { id: true, name: true, shortName: true } },
    },
  })

  const playerMap = new Map(players.map((p) => [p.id, p]))

  return sorted
    .map((s) => {
      const player = playerMap.get(s.playerId)
      if (!player) return null
      return {
        playerId: player.id,
        playerName: player.name,
        playerNumber: player.number,
        teamId: player.team.id,
        teamName: player.team.name,
        teamShortName: player.team.shortName,
        yellowCards: s.yellow,
        redCards: s.red,
        totalCards: s.total,
      }
    })
    .filter((s): s is MostCardedPlayer => s !== null)
}

export const getMostCardedPlayers = (limit = 10) =>
  unstable_cache(
    () => _getMostCardedPlayers(limit),
    [`most-carded-${limit}`],
    { revalidate: CACHE_TTL }
  )()

async function _getTeamRankings(): Promise<TeamRanking[]> {
  const teams = await prisma.team.findMany({
    select: { id: true, name: true, shortName: true, logo: true },
  })

  const matches = await prisma.match.findMany({
    where: { status: 'FULL_TIME' },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      matchDate: true,
    },
    orderBy: { matchDate: 'desc' },
  })

  return teams.map((team) => {
    const teamMatches = matches.filter(
      (m) => m.homeTeamId === team.id || m.awayTeamId === team.id
    )

    let won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0
    const form: ('W' | 'D' | 'L')[] = []

    for (const m of teamMatches) {
      const isHome = m.homeTeamId === team.id
      const scored = isHome ? m.homeScore : m.awayScore
      const conceded = isHome ? m.awayScore : m.homeScore

      goalsFor += scored
      goalsAgainst += conceded

      if (scored > conceded) { won++; if (form.length < 5) form.push('W') }
      else if (scored < conceded) { lost++; if (form.length < 5) form.push('L') }
      else { drawn++; if (form.length < 5) form.push('D') }
    }

    return {
      teamId: team.id,
      teamName: team.name,
      teamShortName: team.shortName,
      teamLogo: team.logo,
      played: teamMatches.length,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points: won * POINTS_WIN + drawn * POINTS_DRAW,
      form,
    }
  })
  .sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.teamName.localeCompare(b.teamName)
  })
}

export const getTeamRankings = unstable_cache(
  _getTeamRankings,
  ['team-rankings'],
  { revalidate: CACHE_TTL }
)

async function _getMatchRecords(): Promise<{
  biggestWin: MatchRecord | null
  highestScoring: MatchRecord | null
}> {
  const matches = await prisma.match.findMany({
    where: { status: 'FULL_TIME' },
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      matchDate: true,
      homeTeam: { select: { id: true, name: true, shortName: true } },
      awayTeam: { select: { id: true, name: true, shortName: true } },
    },
    orderBy: { matchDate: 'desc' },
  })

  let biggestWin: MatchRecord | null = null
  let highestScoring: MatchRecord | null = null
  let maxDiff = 0
  let maxTotal = 0

  for (const m of matches) {
    if (!m.homeTeam || !m.awayTeam) continue

    const diff = Math.abs(m.homeScore - m.awayScore)
    const total = m.homeScore + m.awayScore

    if (diff > maxDiff) {
      maxDiff = diff
      biggestWin = {
        matchId: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        matchDate: m.matchDate.toISOString(),
        label: 'Biggest Win',
      }
    }

    if (total > maxTotal) {
      maxTotal = total
      highestScoring = {
        matchId: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        matchDate: m.matchDate.toISOString(),
        label: 'Highest Scoring',
      }
    }
  }

  return { biggestWin, highestScoring }
}

export const getMatchRecords = unstable_cache(
  _getMatchRecords,
  ['match-records'],
  { revalidate: CACHE_TTL }
)

export async function getPlayerStats(playerId: string): Promise<PlayerStats> {
  const [goals, cards, lineupEntries] = await Promise.all([
    prisma.goal.findMany({
      where: { playerId },
      select: { matchId: true, minute: true, isOwnGoal: true },
    }),
    prisma.card.findMany({
      where: { playerId },
      select: { matchId: true, minute: true, type: true },
    }),
    prisma.lineupPlayer.findMany({
      where: { playerId },
      select: {
        lineup: {
          select: {
            matchId: true,
            teamId: true,
            match: {
              select: {
                id: true,
                matchDate: true,
                homeTeamId: true,
                awayTeamId: true,
                homeScore: true,
                awayScore: true,
                status: true,
                homeTeam: { select: { id: true, name: true, shortName: true } },
                awayTeam: { select: { id: true, name: true, shortName: true } },
              },
            },
          },
        },
      },
    }),
  ])

  // Build match history
  const matchHistory: PlayerMatchEntry[] = []
  const seenMatches = new Set<string>()

  for (const entry of lineupEntries) {
    const match = entry.lineup.match
    if (!match.homeTeam || !match.awayTeam || match.status !== 'FULL_TIME') continue
    if (seenMatches.has(match.id)) continue
    seenMatches.add(match.id)

    const isHome = entry.lineup.teamId === match.homeTeamId
    const opponent = isHome ? match.awayTeam : match.homeTeam
    const scored = isHome ? match.homeScore : match.awayScore
    const conceded = isHome ? match.awayScore : match.homeScore

    let result: 'W' | 'D' | 'L' = 'D'
    if (scored > conceded) result = 'W'
    else if (scored < conceded) result = 'L'

    matchHistory.push({
      matchId: match.id,
      matchDate: match.matchDate.toISOString(),
      opponent: { id: opponent.id, name: opponent.name, shortName: opponent.shortName },
      score: `${match.homeScore} - ${match.awayScore}`,
      result,
      goals: goals
        .filter((g) => g.matchId === match.id)
        .map((g) => ({ minute: g.minute, isOwnGoal: g.isOwnGoal })),
      cards: cards
        .filter((c) => c.matchId === match.id)
        .map((c) => ({ minute: c.minute, type: c.type })),
    })
  }

  matchHistory.sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())

  return {
    goals: goals.filter((g) => !g.isOwnGoal).length,
    yellowCards: cards.filter((c) => c.type === 'YELLOW').length,
    redCards: cards.filter((c) => c.type === 'RED').length,
    matchesPlayed: matchHistory.length,
    matchHistory,
  }
}

export async function getTeamStats(teamId: string): Promise<TeamStats> {
  const matches = await prisma.match.findMany({
    where: {
      status: 'FULL_TIME',
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      matchDate: true,
    },
    orderBy: { matchDate: 'desc' },
  })

  let won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0, cleanSheets = 0
  const form: ('W' | 'D' | 'L')[] = []

  for (const m of matches) {
    const isHome = m.homeTeamId === teamId
    const scored = isHome ? m.homeScore : m.awayScore
    const conceded = isHome ? m.awayScore : m.homeScore

    goalsFor += scored
    goalsAgainst += conceded
    if (conceded === 0) cleanSheets++

    if (scored > conceded) { won++; if (form.length < 5) form.push('W') }
    else if (scored < conceded) { lost++; if (form.length < 5) form.push('L') }
    else { drawn++; if (form.length < 5) form.push('D') }
  }

  const [yellowCards, redCards] = await Promise.all([
    prisma.card.count({ where: { teamId, type: 'YELLOW' } }),
    prisma.card.count({ where: { teamId, type: 'RED' } }),
  ])

  // Top scorer
  const topScorerData = await prisma.goal.groupBy({
    by: ['playerId'],
    where: { teamId, isOwnGoal: false },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 1,
  })

  let topScorer: TeamStats['topScorer'] = null
  if (topScorerData.length > 0) {
    const player = await prisma.player.findUnique({
      where: { id: topScorerData[0].playerId },
      select: { id: true, name: true },
    })
    if (player) {
      topScorer = {
        playerId: player.id,
        playerName: player.name,
        goals: topScorerData[0]._count.id,
      }
    }
  }

  return {
    played: matches.length,
    won,
    drawn,
    lost,
    points: won * POINTS_WIN + drawn * POINTS_DRAW,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    yellowCards,
    redCards,
    cleanSheets,
    form,
    topScorer,
  }
}

export async function getGroupStats(groupId: string) {
  const [totalGoals, topScorer, mostCarded] = await Promise.all([
    prisma.goal.count({
      where: { match: { groupId } },
    }),
    getTopScorersForGroup(groupId, 1),
    getMostCardedForGroup(groupId, 1),
  ])

  return {
    totalGoals,
    topScorer: topScorer[0] ?? null,
    mostCarded: mostCarded[0] ?? null,
  }
}

async function getTopScorersForGroup(groupId: string, limit: number) {
  const goals = await prisma.goal.findMany({
    where: { match: { groupId }, isOwnGoal: false },
    select: { playerId: true },
  })

  const counts = new Map<string, number>()
  for (const g of goals) {
    counts.set(g.playerId, (counts.get(g.playerId) ?? 0) + 1)
  }

  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  if (sorted.length === 0) return []

  const players = await prisma.player.findMany({
    where: { id: { in: sorted.map((s) => s[0]) } },
    select: {
      id: true,
      name: true,
      number: true,
      team: { select: { id: true, name: true, shortName: true } },
    },
  })

  return sorted.map((s) => {
    const player = players.find((p) => p.id === s[0])
    return player ? { ...player, goals: s[1] } : null
  }).filter(Boolean)
}

async function getMostCardedForGroup(groupId: string, limit: number) {
  const cards = await prisma.card.findMany({
    where: { match: { groupId } },
    select: { playerId: true, type: true },
  })

  const counts = new Map<string, { yellow: number; red: number }>()
  for (const c of cards) {
    const existing = counts.get(c.playerId) ?? { yellow: 0, red: 0 }
    if (c.type === 'YELLOW') existing.yellow++
    else existing.red++
    counts.set(c.playerId, existing)
  }

  const sorted = Array.from(counts.entries())
    .map(([playerId, c]) => ({ playerId, ...c, total: c.yellow + c.red }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)

  if (sorted.length === 0) return []

  const players = await prisma.player.findMany({
    where: { id: { in: sorted.map((s) => s.playerId) } },
    select: {
      id: true,
      name: true,
      number: true,
      team: { select: { id: true, name: true, shortName: true } },
    },
  })

  return sorted.map((s) => {
    const player = players.find((p) => p.id === s.playerId)
    return player ? { ...player, yellowCards: s.yellow, redCards: s.red, totalCards: s.total } : null
  }).filter(Boolean)
}
