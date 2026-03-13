export interface CompetitionStats {
  totalMatches: number
  completedMatches: number
  scheduledMatches: number
  totalGoals: number
  totalYellowCards: number
  totalRedCards: number
  avgGoalsPerMatch: number
}

export interface TopScorer {
  playerId: string
  playerName: string
  playerNumber: number
  playerPhoto: string | null
  teamId: string
  teamName: string
  teamShortName: string
  teamLogo: string | null
  goals: number
}

export interface MostCardedPlayer {
  playerId: string
  playerName: string
  playerNumber: number
  teamId: string
  teamName: string
  teamShortName: string
  yellowCards: number
  redCards: number
  totalCards: number
}

export interface TeamRanking {
  teamId: string
  teamName: string
  teamShortName: string
  teamLogo: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  form: ('W' | 'D' | 'L')[]
}

export interface MatchRecord {
  matchId: string
  homeTeam: { id: string; name: string; shortName: string }
  awayTeam: { id: string; name: string; shortName: string }
  homeScore: number
  awayScore: number
  matchDate: string
  label: string
}

export interface PlayerStats {
  goals: number
  yellowCards: number
  redCards: number
  matchesPlayed: number
  matchHistory: PlayerMatchEntry[]
}

export interface PlayerMatchEntry {
  matchId: string
  matchDate: string
  opponent: { id: string; name: string; shortName: string }
  score: string
  result: 'W' | 'D' | 'L'
  goals: { minute: number; isOwnGoal: boolean }[]
  cards: { minute: number; type: 'YELLOW' | 'RED' }[]
}

export interface TeamStats {
  played: number
  won: number
  drawn: number
  lost: number
  points: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  yellowCards: number
  redCards: number
  cleanSheets: number
  form: ('W' | 'D' | 'L')[]
  topScorer: { playerId: string; playerName: string; goals: number } | null
}
