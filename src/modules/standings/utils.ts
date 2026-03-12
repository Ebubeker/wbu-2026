import { POINTS_WIN, POINTS_DRAW } from '@/lib/constants'
import type { StandingsRow } from './types'

interface TeamInfo {
  id: string
  name: string
  shortName: string
  logo: string | null
}

interface MatchInfo {
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number
  awayScore: number
  status: string
}

interface TeamStats {
  team: TeamInfo
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export function calculateStandings(
  teams: TeamInfo[],
  matches: MatchInfo[]
): StandingsRow[] {
  // Initialize stats map
  const statsMap = new Map<string, TeamStats>()

  for (const team of teams) {
    statsMap.set(team.id, {
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    })
  }

  // Process only FULL_TIME matches
  const completedMatches = matches.filter((m) => m.status === 'FULL_TIME')

  for (const match of completedMatches) {
    if (!match.homeTeamId || !match.awayTeamId) continue
    const homeStats = statsMap.get(match.homeTeamId)
    const awayStats = statsMap.get(match.awayTeamId)

    if (!homeStats || !awayStats) continue

    // Update played
    homeStats.played++
    awayStats.played++

    // Update goals
    homeStats.goalsFor += match.homeScore
    homeStats.goalsAgainst += match.awayScore
    awayStats.goalsFor += match.awayScore
    awayStats.goalsAgainst += match.homeScore

    // Update wins/draws/losses
    if (match.homeScore > match.awayScore) {
      homeStats.won++
      awayStats.lost++
    } else if (match.homeScore < match.awayScore) {
      homeStats.lost++
      awayStats.won++
    } else {
      homeStats.drawn++
      awayStats.drawn++
    }
  }

  // Calculate derived values
  for (const stats of statsMap.values()) {
    stats.goalDifference = stats.goalsFor - stats.goalsAgainst
    stats.points = stats.won * POINTS_WIN + stats.drawn * POINTS_DRAW
  }

  const entries = Array.from(statsMap.values())

  // Check if any matches have been played
  const hasMatches = completedMatches.length > 0

  if (!hasMatches) {
    // Sort alphabetically if no matches played
    entries.sort((a, b) => a.team.name.localeCompare(b.team.name))
    return entries.map((stats, index) => ({
      position: index + 1,
      ...stats,
    }))
  }

  // Sort by: Pts desc -> GD desc -> GF desc -> head-to-head
  entries.sort((a, b) => {
    // Points descending
    if (b.points !== a.points) return b.points - a.points

    // Goal difference descending
    if (b.goalDifference !== a.goalDifference)
      return b.goalDifference - a.goalDifference

    // Goals for descending
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor

    // Head-to-head
    const h2hResult = getHeadToHead(a.team.id, b.team.id, completedMatches)
    if (h2hResult !== 0) return h2hResult

    // Alphabetical as final tiebreaker
    return a.team.name.localeCompare(b.team.name)
  })

  // Assign positions (shared if truly tied)
  const result: StandingsRow[] = []
  for (let i = 0; i < entries.length; i++) {
    let position = i + 1

    // Check if this team is tied with the previous one on all criteria
    if (i > 0) {
      const prev = entries[i - 1]
      const curr = entries[i]
      if (
        prev.points === curr.points &&
        prev.goalDifference === curr.goalDifference &&
        prev.goalsFor === curr.goalsFor &&
        getHeadToHead(prev.team.id, curr.team.id, completedMatches) === 0
      ) {
        position = result[i - 1].position
      }
    }

    result.push({
      position,
      ...entries[i],
    })
  }

  return result
}

function getHeadToHead(
  teamAId: string,
  teamBId: string,
  matches: MatchInfo[]
): number {
  // Returns negative if A is better, positive if B is better, 0 if tied
  let aGoals = 0
  let bGoals = 0

  for (const match of matches) {
    if (match.homeTeamId === teamAId && match.awayTeamId === teamBId) {
      aGoals += match.homeScore
      bGoals += match.awayScore
    } else if (match.homeTeamId === teamBId && match.awayTeamId === teamAId) {
      aGoals += match.awayScore
      bGoals += match.homeScore
    }
  }

  // If they haven't played each other, return 0
  if (aGoals === 0 && bGoals === 0) return 0

  // More goals = better position (sort ascending, so negative means A is first)
  if (aGoals !== bGoals) return bGoals - aGoals

  return 0
}
