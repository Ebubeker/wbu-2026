export interface BracketTeam {
  id: string
  name: string
  shortName: string
  logo: string | null
}

export interface BracketMatch {
  id: string
  homeTeam: BracketTeam | null
  awayTeam: BracketTeam | null
  homePlaceholder: string | null
  awayPlaceholder: string | null
  homeScore: number
  awayScore: number
  status: string
  stage: string
  matchDate: Date
  venue: string | null
}

export interface BracketRound {
  stage: string
  label: string
  matches: BracketMatch[]
}
