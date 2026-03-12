export interface MatchData {
  id: string
  homeTeam: { id: string; name: string; shortName: string; logo: string | null } | null
  awayTeam: { id: string; name: string; shortName: string; logo: string | null } | null
  homePlaceholder: string | null
  awayPlaceholder: string | null
  homeScore: number
  awayScore: number
  status: string
  stage: string
  matchDate: Date | string
  venue: string | null
  matchMinute: number
  groupId: string | null
  group?: { id: string; name: string } | null
}

export interface MatchWithEvents extends MatchData {
  goals: Array<{
    id: string
    minute: number
    isOwnGoal: boolean
    player: { id: string; name: string; number: number }
    team: { id: string; name: string }
  }>
  cards: Array<{
    id: string
    minute: number
    type: 'YELLOW' | 'RED'
    player: { id: string; name: string; number: number }
    team: { id: string; name: string }
  }>
  homeTeam: {
    id: string
    name: string
    shortName: string
    logo: string | null
    players: Array<{ id: string; name: string; number: number; position: string }>
  } | null
  awayTeam: {
    id: string
    name: string
    shortName: string
    logo: string | null
    players: Array<{ id: string; name: string; number: number; position: string }>
  } | null
}

export interface MatchFormValues {
  homeTeamId: string
  awayTeamId: string
  stage: string
  groupId?: string | null
  matchDate: string
  venue?: string
}

export interface MatchFilters {
  stage?: string
  status?: string
  groupId?: string
}
