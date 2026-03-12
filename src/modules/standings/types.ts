export interface StandingsRow {
  position: number
  team: { id: string; name: string; shortName: string; logo: string | null }
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export interface GroupStandings {
  group: { id: string; name: string; order: number }
  standings: StandingsRow[]
}
