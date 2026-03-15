export interface VoteCounts {
  home: number
  draw: number
  away: number
  total: number
  userVote?: 'HOME' | 'DRAW' | 'AWAY' | null
}

export interface MotmCandidate {
  playerId: string
  playerName: string
  playerNumber: number
  teamName: string
  teamId: string
  votes: number
}

export interface MotmResult {
  candidates: MotmCandidate[]
  total: number
  userVote?: string | null
}
